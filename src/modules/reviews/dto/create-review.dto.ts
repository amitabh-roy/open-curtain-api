import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the hospital being reviewed',
  })
  @IsInt()
  @Min(1)
  hospitalId: number;

  @ApiProperty({
    example: 1,
    description: 'Reusable unit definition ID mapped to the selected hospital',
  })
  @IsInt()
  @Min(1)
  unitId: number;

  @ApiProperty({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'Rating from 1 (worst) to 5 (best)',
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: 'Excellent care and friendly staff.',
    description: 'Review comment text',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment: string;

  @ApiProperty({
    example: 'full_time',
    description: 'Employment arrangement for the reviewer',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employmentType: string;

  @ApiProperty({
    example: 'day',
    description: 'Shift pattern for the reviewer',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  shiftType: string;

  @ApiPropertyOptional({ example: 43.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  hourlyRate?: number;

  @ApiPropertyOptional({ example: '5–6' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  patientRatio?: string;

  @ApiPropertyOptional({ example: 'Usually' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  mealBreaks?: string;

  @ApiPropertyOptional({ example: 'Sometimes' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  bathroomBreaks?: string;

  @ApiPropertyOptional({ example: '$150/mo' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  parkingCost?: string;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  managementRating?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  wouldReturn?: boolean;

  @ApiPropertyOptional({
    example: 'Registered Nurse (RN)',
    description:
      'Occupation selected during review submission; used to categorize the review role',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  roleName?: string;

  @ApiPropertyOptional({ example: 'I currently work here' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  workedWhen?: string;

  @ApiPropertyOptional({ example: '1–2 years' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employmentLength?: string;

  @ApiPropertyOptional({ example: '36–40' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  hoursPerWeek?: string;

  @ApiPropertyOptional({ example: '1–2 years' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  yearsInRole?: string;

  @ApiPropertyOptional({ example: 85000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  yearlyCompensation?: number;

  @ApiPropertyOptional({ example: 'yes' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  hasBenefits?: string;

  @ApiPropertyOptional({ example: 'yes' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  orientationAdequate?: string;

  @ApiPropertyOptional({ example: 'Sometimes' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  understaffing?: string;

  @ApiPropertyOptional({ example: 'Sometimes' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  floatFrequency?: string;

  @ApiPropertyOptional({ example: 'yes' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  clockOutOnTime?: string;

  @ApiPropertyOptional({ example: 'no' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  mandatoryOnCall?: string;

  @ApiPropertyOptional({ example: 'yes' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  overtimeOpportunity?: string;

  @ApiPropertyOptional({ example: 'yes' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  shiftDifferentials?: string;

  @ApiPropertyOptional({ example: 'yes' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  lovedOneCare?: string;

  @ApiPropertyOptional({ example: ['Unsafe staffing'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lovedOneReasons?: string[];

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  staffingRating?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  cultureRating?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  compensationRating?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  workLifeRating?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  safetyRating?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  resourcesRating?: number;

  @ApiPropertyOptional({ example: ['Supportive'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  managementTags?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  wouldRecommend?: boolean;

  @ApiPropertyOptional({ example: 'yes' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  hasGrowth?: string;

  @ApiPropertyOptional({ example: 'yes' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  scheduleAccommodating?: string;

  @ApiPropertyOptional({ example: 'yes' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  feelsSafe?: string;

  @ApiPropertyOptional({ example: ['Violence'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  safetyConcerns?: string[];
}
