import { InternalServerErrorException } from '@nestjs/common';
import { QueryTypes } from 'sequelize';

import { API_RESPONSE } from '../../../common/constants/api-response.constants';
import { HospitalModel } from '../../../database/models/hospital.model';
import { HospitalFiltersResponseDto } from '../dto/hospital-filters-response.dto';

function readDistinctColumn(rows: unknown, key: string): string[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (typeof row !== 'object' || row === null || !(key in row)) {
        return '';
      }

      const value = (row as Record<string, unknown>)[key];

      if (typeof value === 'string') {
        return value.trim();
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }

      return '';
    })
    .filter(Boolean);
}

export async function loadHospitalFilterOptions(
  hospitalModel: typeof HospitalModel,
): Promise<HospitalFiltersResponseDto> {
  const sequelize = hospitalModel.sequelize;

  if (!sequelize) {
    throw new InternalServerErrorException(API_RESPONSE.INTERNAL_ERROR);
  }

  const [stateRows, facilityTypeRows] = await Promise.all([
    sequelize.query(
      'SELECT DISTINCT state FROM hospitals WHERE deleted_at IS NULL AND is_active = true ORDER BY state ASC',
      { type: QueryTypes.SELECT },
    ),
    sequelize.query(
      'SELECT DISTINCT facility_type AS "facilityType" FROM hospitals WHERE deleted_at IS NULL AND is_active = true ORDER BY facility_type ASC',
      { type: QueryTypes.SELECT },
    ),
  ]);

  return {
    states: readDistinctColumn(stateRows, 'state'),
    facilityTypes: readDistinctColumn(facilityTypeRows, 'facilityType'),
  };
}
