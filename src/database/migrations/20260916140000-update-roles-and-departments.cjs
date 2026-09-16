'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const now = new Date();

      // 1. Soft delete 'Other' in roles
      await queryInterface.bulkUpdate(
        'roles',
        { deleted_at: now },
        { name: 'Other' },
        { transaction },
      );

      // 2. Insert 'Case Manager' role if not already existing
      const [existingCaseManager] = await queryInterface.sequelize.query(
        `SELECT id FROM roles WHERE name = 'Case Manager' LIMIT 1`,
        { transaction },
      );

      if (existingCaseManager.length === 0) {
        await queryInterface.bulkInsert(
          'roles',
          [{ name: 'Case Manager' }],
          { transaction },
        );
      } else {
        // Ensure not marked deleted if it previously existed
        await queryInterface.bulkUpdate(
          'roles',
          { deleted_at: null },
          { name: 'Case Manager' },
          { transaction },
        );
      }

      // Reset sequence for roles
      await queryInterface.sequelize.query(
        `SELECT setval(pg_get_serial_sequence('"roles"', 'id'), COALESCE(MAX(id), 1), true) FROM "roles";`,
        { transaction },
      );

      // 3. Soft delete 'Other' and 'Skilled Nursing Facility (SNF)' in units (departments)
      await queryInterface.bulkUpdate(
        'units',
        { deleted_at: now },
        {
          name: ['Other', 'Skilled Nursing Facility (SNF)'],
        },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Restore 'Other' in roles
      await queryInterface.bulkUpdate(
        'roles',
        { deleted_at: null },
        { name: 'Other' },
        { transaction },
      );

      // Restore 'Other' and 'Skilled Nursing Facility (SNF)' in units
      await queryInterface.bulkUpdate(
        'units',
        { deleted_at: null },
        {
          name: ['Other', 'Skilled Nursing Facility (SNF)'],
        },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
