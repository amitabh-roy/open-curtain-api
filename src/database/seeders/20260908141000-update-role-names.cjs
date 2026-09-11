'use strict';

const RENAMES = [
  {
    old: 'Advanced Practice RN / NP (APRN)',
    new: 'Nurse Practitioner (NP, APRN)',
  },
  {
    old: 'Physician Assistant (PA-C)',
    new: 'Physician Associate (PA-C)',
  },
  {
    old: 'Dietitian',
    new: 'Registered Dietitian',
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      for (const rename of RENAMES) {
        await queryInterface.bulkUpdate(
          'roles',
          { name: rename.new },
          { name: rename.old },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      for (const rename of RENAMES) {
        await queryInterface.bulkUpdate(
          'roles',
          { name: rename.old },
          { name: rename.new },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
