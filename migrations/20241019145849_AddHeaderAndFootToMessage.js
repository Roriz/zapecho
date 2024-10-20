/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('messages', function (table) {
    table.string('header');
    table.string('footer');
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('messages', function (table) {
    table.dropColumn('header');
    table.dropColumn('footer');
  })
};
