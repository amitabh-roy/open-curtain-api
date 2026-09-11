import { ReviewModel } from '../../../database/models/review.model';
import { toHospitalSlug } from '../../../common/utils/hospital-slug.util';
import { CreateReviewDto } from '../dto/create-review.dto';
import { ReviewResponseDto } from '../dto/review-response.dto';

function trimOrNull(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalRating(value: number | undefined): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(1, Math.min(5, Math.round(value)));
}

function parseOptionalAmount(value: number | undefined): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return null;
  }

  return value >= 0 ? value : null;
}

function parseStringArray(value: string[] | undefined): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const items = value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
}

export function buildReviewAttributesFromDto(
  dto: CreateReviewDto,
): Partial<ReviewModel> {
  return {
    hospitalId: dto.hospitalId,
    unitId: dto.unitId,
    rating: dto.rating,
    comment: dto.comment.trim(),
    employmentType: dto.employmentType.trim().toLowerCase(),
    shiftType: dto.shiftType.trim().toLowerCase(),
    hourlyRate: dto.hourlyRate ?? null,
    patientRatio: trimOrNull(dto.patientRatio),
    mealBreaks: trimOrNull(dto.mealBreaks),
    bathroomBreaks: trimOrNull(dto.bathroomBreaks),
    parkingCost: trimOrNull(dto.parkingCost),
    managementRating: parseOptionalRating(dto.managementRating),
    wouldReturn: dto.wouldReturn ?? null,
    workedWhen: trimOrNull(dto.workedWhen),
    employmentLength: trimOrNull(dto.employmentLength),
    hoursPerWeek: trimOrNull(dto.hoursPerWeek),
    yearsInRole: trimOrNull(dto.yearsInRole),
    yearlyCompensation: parseOptionalAmount(dto.yearlyCompensation),
    hasBenefits: trimOrNull(dto.hasBenefits),
    orientationAdequate: trimOrNull(dto.orientationAdequate),
    understaffing: trimOrNull(dto.understaffing),
    floatFrequency: trimOrNull(dto.floatFrequency),
    clockOutOnTime: trimOrNull(dto.clockOutOnTime),
    mandatoryOnCall: trimOrNull(dto.mandatoryOnCall),
    overtimeOpportunity: trimOrNull(dto.overtimeOpportunity),
    shiftDifferentials: trimOrNull(dto.shiftDifferentials),
    lovedOneCare: trimOrNull(dto.lovedOneCare),
    lovedOneReasons: parseStringArray(dto.lovedOneReasons),
    staffingRating: parseOptionalRating(dto.staffingRating),
    cultureRating: parseOptionalRating(dto.cultureRating),
    compensationRating: parseOptionalRating(dto.compensationRating),
    workLifeRating: parseOptionalRating(dto.workLifeRating),
    safetyRating: parseOptionalRating(dto.safetyRating),
    resourcesRating: parseOptionalRating(dto.resourcesRating),
    managementTags: parseStringArray(dto.managementTags),
    wouldRecommend: dto.wouldRecommend ?? null,
    hasGrowth: trimOrNull(dto.hasGrowth),
    scheduleAccommodating: trimOrNull(dto.scheduleAccommodating),
    feelsSafe: trimOrNull(dto.feelsSafe),
    safetyConcerns: parseStringArray(dto.safetyConcerns),
  };
}

export function buildReviewUpdatesFromDto(
  dto: Partial<CreateReviewDto>,
): Partial<ReviewModel> {
  const updates: Partial<ReviewModel> = {};

  if (dto.rating !== undefined) updates.rating = dto.rating;
  if (dto.comment !== undefined) updates.comment = dto.comment.trim();
  if (dto.employmentType !== undefined) {
    updates.employmentType = dto.employmentType.trim().toLowerCase();
  }
  if (dto.shiftType !== undefined) {
    updates.shiftType = dto.shiftType.trim().toLowerCase();
  }
  if (dto.hourlyRate !== undefined) updates.hourlyRate = dto.hourlyRate;
  if (dto.patientRatio !== undefined) {
    updates.patientRatio = trimOrNull(dto.patientRatio);
  }
  if (dto.mealBreaks !== undefined)
    updates.mealBreaks = trimOrNull(dto.mealBreaks);
  if (dto.bathroomBreaks !== undefined) {
    updates.bathroomBreaks = trimOrNull(dto.bathroomBreaks);
  }
  if (dto.parkingCost !== undefined) {
    updates.parkingCost = trimOrNull(dto.parkingCost);
  }
  if (dto.managementRating !== undefined) {
    updates.managementRating = parseOptionalRating(dto.managementRating);
  }
  if (dto.wouldReturn !== undefined) updates.wouldReturn = dto.wouldReturn;
  if (dto.workedWhen !== undefined)
    updates.workedWhen = trimOrNull(dto.workedWhen);
  if (dto.employmentLength !== undefined) {
    updates.employmentLength = trimOrNull(dto.employmentLength);
  }
  if (dto.hoursPerWeek !== undefined) {
    updates.hoursPerWeek = trimOrNull(dto.hoursPerWeek);
  }
  if (dto.yearsInRole !== undefined)
    updates.yearsInRole = trimOrNull(dto.yearsInRole);
  if (dto.yearlyCompensation !== undefined) {
    updates.yearlyCompensation = parseOptionalAmount(dto.yearlyCompensation);
  }
  if (dto.hasBenefits !== undefined)
    updates.hasBenefits = trimOrNull(dto.hasBenefits);
  if (dto.orientationAdequate !== undefined) {
    updates.orientationAdequate = trimOrNull(dto.orientationAdequate);
  }
  if (dto.understaffing !== undefined) {
    updates.understaffing = trimOrNull(dto.understaffing);
  }
  if (dto.floatFrequency !== undefined) {
    updates.floatFrequency = trimOrNull(dto.floatFrequency);
  }
  if (dto.clockOutOnTime !== undefined) {
    updates.clockOutOnTime = trimOrNull(dto.clockOutOnTime);
  }
  if (dto.mandatoryOnCall !== undefined) {
    updates.mandatoryOnCall = trimOrNull(dto.mandatoryOnCall);
  }
  if (dto.overtimeOpportunity !== undefined) {
    updates.overtimeOpportunity = trimOrNull(dto.overtimeOpportunity);
  }
  if (dto.shiftDifferentials !== undefined) {
    updates.shiftDifferentials = trimOrNull(dto.shiftDifferentials);
  }
  if (dto.lovedOneCare !== undefined) {
    updates.lovedOneCare = trimOrNull(dto.lovedOneCare);
  }
  if (dto.lovedOneReasons !== undefined) {
    updates.lovedOneReasons = parseStringArray(dto.lovedOneReasons);
  }
  if (dto.staffingRating !== undefined) {
    updates.staffingRating = parseOptionalRating(dto.staffingRating);
  }
  if (dto.cultureRating !== undefined) {
    updates.cultureRating = parseOptionalRating(dto.cultureRating);
  }
  if (dto.compensationRating !== undefined) {
    updates.compensationRating = parseOptionalRating(dto.compensationRating);
  }
  if (dto.workLifeRating !== undefined) {
    updates.workLifeRating = parseOptionalRating(dto.workLifeRating);
  }
  if (dto.safetyRating !== undefined) {
    updates.safetyRating = parseOptionalRating(dto.safetyRating);
  }
  if (dto.resourcesRating !== undefined) {
    updates.resourcesRating = parseOptionalRating(dto.resourcesRating);
  }
  if (dto.managementTags !== undefined) {
    updates.managementTags = parseStringArray(dto.managementTags);
  }
  if (dto.wouldRecommend !== undefined)
    updates.wouldRecommend = dto.wouldRecommend;
  if (dto.hasGrowth !== undefined)
    updates.hasGrowth = trimOrNull(dto.hasGrowth);
  if (dto.scheduleAccommodating !== undefined) {
    updates.scheduleAccommodating = trimOrNull(dto.scheduleAccommodating);
  }
  if (dto.feelsSafe !== undefined)
    updates.feelsSafe = trimOrNull(dto.feelsSafe);
  if (dto.safetyConcerns !== undefined) {
    updates.safetyConcerns = parseStringArray(dto.safetyConcerns);
  }

  return updates;
}

function toNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringArray(value: string[] | null | undefined): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  return value;
}

export function buildReviewResponse(review: ReviewModel): ReviewResponseDto {
  return {
    id: review.id,
    hospitalId: review.hospitalId,
    hospitalName: review.hospital?.name,
    hospitalSlug: review.hospital?.name
      ? toHospitalSlug(review.hospital.name, review.hospital.id ?? review.hospitalId)
      : undefined,
    unitId: review.unitId,
    unitName: review.unit?.name ?? '',
    roleId: review.roleId,
    roleName: review.role?.name ?? '',
    rating: review.rating,
    comment: review.comment,
    employmentType: review.employmentType,
    shiftType: review.shiftType,
    status: review.status,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    hourlyRate: toNumber(review.hourlyRate),
    patientRatio: review.patientRatio,
    mealBreaks: review.mealBreaks,
    bathroomBreaks: review.bathroomBreaks,
    parkingCost: review.parkingCost,
    managementRating: toNumber(review.managementRating),
    wouldReturn: review.wouldReturn,
    adminFeedback: review.adminFeedback,
    workedWhen: review.workedWhen,
    employmentLength: review.employmentLength,
    hoursPerWeek: review.hoursPerWeek,
    yearsInRole: review.yearsInRole,
    yearlyCompensation: toNumber(review.yearlyCompensation),
    hasBenefits: review.hasBenefits,
    orientationAdequate: review.orientationAdequate,
    understaffing: review.understaffing,
    floatFrequency: review.floatFrequency,
    clockOutOnTime: review.clockOutOnTime,
    mandatoryOnCall: review.mandatoryOnCall,
    overtimeOpportunity: review.overtimeOpportunity,
    shiftDifferentials: review.shiftDifferentials,
    lovedOneCare: review.lovedOneCare,
    lovedOneReasons: toStringArray(review.lovedOneReasons),
    staffingRating: toNumber(review.staffingRating),
    cultureRating: toNumber(review.cultureRating),
    compensationRating: toNumber(review.compensationRating),
    workLifeRating: toNumber(review.workLifeRating),
    safetyRating: toNumber(review.safetyRating),
    resourcesRating: toNumber(review.resourcesRating),
    managementTags: toStringArray(review.managementTags),
    wouldRecommend: review.wouldRecommend,
    hasGrowth: review.hasGrowth,
    scheduleAccommodating: review.scheduleAccommodating,
    feelsSafe: review.feelsSafe,
    safetyConcerns: toStringArray(review.safetyConcerns),
  };
}
