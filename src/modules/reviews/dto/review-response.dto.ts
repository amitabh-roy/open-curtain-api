import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 1 })
  hospitalId: number;

  @ApiPropertyOptional({ example: 'Jackson Memorial Hospital' })
  hospitalName?: string;

  @ApiPropertyOptional({ example: 'jackson-memorial-hospital-1' })
  hospitalSlug?: string;

  @ApiProperty({
    example: 1,
    description: 'Reusable unit definition ID mapped to the reviewed hospital',
  })
  unitId: number;

  @ApiProperty({ example: 'ICU' })
  unitName: string;

  @ApiProperty({ example: 1 })
  roleId: number;

  @ApiProperty({ example: 'nurse' })
  roleName: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  rating: number;

  @ApiProperty({ example: 'Excellent care and friendly staff.' })
  comment: string;

  @ApiProperty({ example: 'full_time' })
  employmentType: string;

  @ApiProperty({ example: 'day' })
  shiftType: string;

  @ApiProperty({ example: 'approved' })
  status: string;

  @ApiProperty({ example: '2025-05-22T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-05-22T12:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: 43.5 })
  hourlyRate?: number | null;

  @ApiPropertyOptional({ example: '1 : 5' })
  patientRatio?: string | null;

  @ApiPropertyOptional({ example: 'Usually' })
  mealBreaks?: string | null;

  @ApiPropertyOptional({ example: 'Sometimes' })
  bathroomBreaks?: string | null;

  @ApiPropertyOptional({ example: '$150/mo' })
  parkingCost?: string | null;

  @ApiPropertyOptional({ example: 3.5 })
  managementRating?: number | null;

  @ApiPropertyOptional({ example: true })
  wouldReturn?: boolean | null;

  @ApiPropertyOptional({
    example: 'Please remove identifying details before resubmitting.',
  })
  adminFeedback?: string | null;

  @ApiPropertyOptional({ example: 'I currently work here' })
  workedWhen?: string | null;

  @ApiPropertyOptional({ example: '1–2 years' })
  employmentLength?: string | null;

  @ApiPropertyOptional({ example: '36–40' })
  hoursPerWeek?: string | null;

  @ApiPropertyOptional({ example: '1–2 years' })
  yearsInRole?: string | null;

  @ApiPropertyOptional({ example: 85000 })
  yearlyCompensation?: number | null;

  @ApiPropertyOptional({ example: 'yes' })
  hasBenefits?: string | null;

  @ApiPropertyOptional({ example: 'yes' })
  orientationAdequate?: string | null;

  @ApiPropertyOptional({ example: 'Sometimes' })
  understaffing?: string | null;

  @ApiPropertyOptional({ example: 'Sometimes' })
  floatFrequency?: string | null;

  @ApiPropertyOptional({ example: 'yes' })
  clockOutOnTime?: string | null;

  @ApiPropertyOptional({ example: 'no' })
  mandatoryOnCall?: string | null;

  @ApiPropertyOptional({ example: 'yes' })
  overtimeOpportunity?: string | null;

  @ApiPropertyOptional({ example: 'yes' })
  shiftDifferentials?: string | null;

  @ApiPropertyOptional({ example: 'yes' })
  lovedOneCare?: string | null;

  @ApiPropertyOptional({ example: ['Unsafe staffing'] })
  lovedOneReasons?: string[] | null;

  @ApiPropertyOptional({ example: 4 })
  staffingRating?: number | null;

  @ApiPropertyOptional({ example: 4 })
  cultureRating?: number | null;

  @ApiPropertyOptional({ example: 4 })
  compensationRating?: number | null;

  @ApiPropertyOptional({ example: 4 })
  workLifeRating?: number | null;

  @ApiPropertyOptional({ example: 4 })
  safetyRating?: number | null;

  @ApiPropertyOptional({ example: 4 })
  resourcesRating?: number | null;

  @ApiPropertyOptional({ example: ['Supportive'] })
  managementTags?: string[] | null;

  @ApiPropertyOptional({ example: true })
  wouldRecommend?: boolean | null;

  @ApiPropertyOptional({ example: 'yes' })
  hasGrowth?: string | null;

  @ApiPropertyOptional({ example: 'yes' })
  scheduleAccommodating?: string | null;

  @ApiPropertyOptional({ example: 'yes' })
  feelsSafe?: string | null;

  @ApiPropertyOptional({ example: ['Violence'] })
  safetyConcerns?: string[] | null;
}
