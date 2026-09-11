'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Remove the non-partial unique index on (hospital_id, user_id)
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "reviews_hospital_user_unique";',
        { transaction },
      );

      // Recreate as a partial unique index that only enforces uniqueness for active (non-deleted) reviews.
      // This allows users to submit a new review after deleting a previous one.
      await queryInterface.sequelize.query(
        'CREATE UNIQUE INDEX "reviews_hospital_user_unique" ON "reviews" ("hospital_id", "user_id") WHERE "deleted_at" IS NULL;',
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "reviews_hospital_user_unique";',
        { transaction },
      );

      await queryInterface.sequelize.query(
        'CREATE UNIQUE INDEX "reviews_hospital_user_unique" ON "reviews" ("hospital_id", "user_id");',
        { transaction },
      );
    });
  },
};
