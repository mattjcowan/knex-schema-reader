/**
 * Knex Schema Reader (https://github.com/mattjcowan/knex-schema-reader)
 **/

function displayStats (stats) {

  try {
    if (document.querySelector('.stats')) {
      document.querySelector('span.stats-forks').innerText = stats.forks;
      document.querySelector('span.stats-stars').innerText = stats.watchers;
      document.querySelector('span.stats-subscribers').innerText = stats.subscribers;
      document.querySelector('span.stats-open-issues').innerText = stats.openIssues;
    }
  } catch (err) {
    if(console && console.log) console.log(err); // eslint-disable-line no-console
  }

}

$(document).ready(function() {
  var githubApi = 'https://api.github.com/repos/mattjcowan/knex-schema-reader';
  var key = 'github.repo.knexschemareader';
  var data = JSON.parse(window.localStorage.getItem(key)) || {};
  if (data.value) {
    displayStats(data.value);
  }
  if (!data.value || (new Date() - new Date(data.timestamp)) > 300000 /* 5 min */) {
    $.getJSON(githubApi, function (response) {
      data = {
        value: {
          createdAt: response.created_at,
          updatedAt: response.updated_at,
          pushedAt: response.pushed_at,
          forks: response.forks,
          watchers: response.watchers,
          subscribers: response.subscribers_count,
          openIssues: response.open_issues,
        },
        timestamp: new Date(),
      };
      window.localStorage.setItem(key, JSON.stringify(data));
      displayStats(data.value);
    });
  }
});
