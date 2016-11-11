/**
 * Knex Schema Reader (https://github.com/mattjcowan/knex-schema-reader)
 *
 * Copyright © 2016 Matt Cowan, MJCZone Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

class Greeting {

  constructor(name) {
    this.name = name || 'Guest';
  }

  hello() {
    return `Welcome, ${this.name}!`;
  }

}

export default Greeting;
