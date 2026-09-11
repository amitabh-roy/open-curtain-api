import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  DeletedAt,
} from 'sequelize-typescript';

import { HospitalModel } from './hospital.model';
import { RoleModel } from './role.model';
import { UnitModel } from './unit.model';
import { UserModel } from './user.model';

export const REVIEW_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'needs_revision',
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

@Table({
  tableName: 'reviews',
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['hospital_id', 'user_id'],
      name: 'reviews_hospital_user_unique',
      where: {
        deleted_at: null,
      },
    },
  ],
})
export class ReviewModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => HospitalModel)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'hospital_id',
  })
  declare hospitalId: number;

  @ForeignKey(() => UnitModel)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'unit_id',
  })
  declare unitId: number;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'user_id',
  })
  declare userId: number;

  @ForeignKey(() => RoleModel)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'role_id',
  })
  declare roleId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare rating: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare comment: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    field: 'employment_type',
  })
  declare employmentType: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    field: 'shift_type',
  })
  declare shiftType: string;

  @Default('pending')
  @Column({
    type: DataType.ENUM(...REVIEW_STATUSES),
    allowNull: false,
  })
  declare status: ReviewStatus;

  @Column({
    type: DataType.DECIMAL(8, 2),
    allowNull: true,
    field: 'hourly_rate',
  })
  declare hourlyRate: number | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    field: 'patient_ratio',
  })
  declare patientRatio: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    field: 'meal_breaks',
  })
  declare mealBreaks: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    field: 'bathroom_breaks',
  })
  declare bathroomBreaks: string | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    field: 'parking_cost',
  })
  declare parkingCost: string | null;

  @Column({
    type: DataType.DECIMAL(3, 2),
    allowNull: true,
    field: 'management_rating',
  })
  declare managementRating: number | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    field: 'would_return',
  })
  declare wouldReturn: boolean | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'admin_feedback',
  })
  declare adminFeedback: string | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    field: 'worked_when',
  })
  declare workedWhen: string | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    field: 'employment_length',
  })
  declare employmentLength: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    field: 'hours_per_week',
  })
  declare hoursPerWeek: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    field: 'years_in_role',
  })
  declare yearsInRole: string | null;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    field: 'yearly_compensation',
  })
  declare yearlyCompensation: number | null;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    field: 'has_benefits',
  })
  declare hasBenefits: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    field: 'orientation_adequate',
  })
  declare orientationAdequate: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    field: 'understaffing',
  })
  declare understaffing: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    field: 'float_frequency',
  })
  declare floatFrequency: string | null;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    field: 'clock_out_on_time',
  })
  declare clockOutOnTime: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    field: 'mandatory_on_call',
  })
  declare mandatoryOnCall: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    field: 'overtime_opportunity',
  })
  declare overtimeOpportunity: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    field: 'shift_differentials',
  })
  declare shiftDifferentials: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    field: 'loved_one_care',
  })
  declare lovedOneCare: string | null;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    field: 'loved_one_reasons',
  })
  declare lovedOneReasons: string[] | null;

  @Column({
    type: DataType.DECIMAL(3, 2),
    allowNull: true,
    field: 'staffing_rating',
  })
  declare staffingRating: number | null;

  @Column({
    type: DataType.DECIMAL(3, 2),
    allowNull: true,
    field: 'culture_rating',
  })
  declare cultureRating: number | null;

  @Column({
    type: DataType.DECIMAL(3, 2),
    allowNull: true,
    field: 'compensation_rating',
  })
  declare compensationRating: number | null;

  @Column({
    type: DataType.DECIMAL(3, 2),
    allowNull: true,
    field: 'work_life_rating',
  })
  declare workLifeRating: number | null;

  @Column({
    type: DataType.DECIMAL(3, 2),
    allowNull: true,
    field: 'safety_rating',
  })
  declare safetyRating: number | null;

  @Column({
    type: DataType.DECIMAL(3, 2),
    allowNull: true,
    field: 'resources_rating',
  })
  declare resourcesRating: number | null;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    field: 'management_tags',
  })
  declare managementTags: string[] | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    field: 'would_recommend',
  })
  declare wouldRecommend: boolean | null;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    field: 'has_growth',
  })
  declare hasGrowth: string | null;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    field: 'schedule_accommodating',
  })
  declare scheduleAccommodating: string | null;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    field: 'feels_safe',
  })
  declare feelsSafe: string | null;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    field: 'safety_concerns',
  })
  declare safetyConcerns: string[] | null;

  @BelongsTo(() => HospitalModel)
  declare hospital?: HospitalModel;

  @BelongsTo(() => UnitModel)
  declare unit?: UnitModel;

  @BelongsTo(() => UserModel)
  declare user?: UserModel;

  @BelongsTo(() => RoleModel)
  declare role?: RoleModel;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  @DeletedAt
  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'deleted_at',
  })
  declare deletedAt: Date | null;
}
