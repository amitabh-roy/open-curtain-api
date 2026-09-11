import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { fn, col, Op } from 'sequelize';

import { ControllerResponse } from '../../common/interfaces/controller-response.interface';
import {
  parseHospitalIdFromSlug,
  toHospitalSlug,
} from '../../common/utils/hospital-slug.util';
import { handleDatabaseException } from '../../common/utils/database-exception.util';
import { resolveStateSearchValues } from '../../common/utils/state-search.util';
import { HospitalModel } from '../../database/models/hospital.model';
import { HospitalUnitModel } from '../../database/models/hospital-unit.model';
import { ReviewModel } from '../../database/models/review.model';
import { RoleModel } from '../../database/models/role.model';
import { UnitModel } from '../../database/models/unit.model';
import { HOSPITAL_RESPONSE } from './constants/hospital.response';
import { HospitalDetailResponseDto } from './dto/hospital-detail-response.dto';
import { HospitalResponseDto } from './dto/hospital-response.dto';
import { HospitalsListResponseDto } from './dto/hospitals-list-response.dto';
import { ListHospitalsQueryDto } from './dto/list-hospitals-query.dto';
import { SearchHospitalsQueryDto } from './dto/search-hospitals-query.dto';
import { UnitResponseDto } from './dto/unit-response.dto';
import {
  findCmsHospitalBySlugOrName,
  getHospitalAliasCmsId,
} from './utils/cms-hospital-data.util';
import {
  buildHospitalReviewStats,
  type HospitalReviewStats,
} from './utils/hospital-review-stats.util';

@Injectable()
export class HospitalsService {
  constructor(
    @InjectModel(HospitalModel)
    private readonly hospitalModel: typeof HospitalModel,
    @InjectModel(HospitalUnitModel)
    private readonly hospitalUnitModel: typeof HospitalUnitModel,
    @InjectModel(ReviewModel)
    private readonly reviewModel: typeof ReviewModel,
  ) {}

  async findAll(
    query: ListHospitalsQueryDto,
  ): Promise<ControllerResponse<HospitalsListResponseDto>> {
    try {
      const data = await this.findHospitals(query);

      return {
        message: HOSPITAL_RESPONSE.FETCH_ALL,
        data,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: HospitalsService.name,
        operation: 'hospital listing',
      });
    }
  }

  async searchHospitals(
    query: SearchHospitalsQueryDto,
  ): Promise<ControllerResponse<HospitalsListResponseDto>> {
    try {
      const data = await this.findHospitals(query, query.query.trim());

      return {
        message: HOSPITAL_RESPONSE.FETCH_SEARCH_RESULTS,
        data,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: HospitalsService.name,
        operation: 'hospital search',
      });
    }
  }

  async findById(
    id: number,
  ): Promise<ControllerResponse<HospitalDetailResponseDto>> {
    try {
      const hospital = await this.hospitalModel.findByPk(id);

      if (!hospital) {
        throw new NotFoundException(HOSPITAL_RESPONSE.NOT_FOUND);
      }

      return this.buildHospitalDetailResponse(hospital);
    } catch (error) {
      handleDatabaseException(error, {
        context: HospitalsService.name,
        operation: 'hospital detail lookup',
      });
    }
  }

  async findBySlug(
    slug: string,
  ): Promise<ControllerResponse<HospitalDetailResponseDto>> {
    try {
      const trimmed = slug.trim();
      let hospital: HospitalModel | null = null;

      // 1. Try parsing numeric ID from slug suffix (e.g. "tampa-general-hospital-922")
      const numericId = parseHospitalIdFromSlug(trimmed);
      if (numericId) {
        hospital = await this.hospitalModel.findByPk(numericId);
      }

      // 2. Check alias mapping (e.g. "jackson-memorial-hospital" -> CMS 100022)
      const aliasCmsId = getHospitalAliasCmsId(trimmed);

      // 3. Search DB by CMS ID (supporting raw number, CMS- prefixed, and alias)
      if (!hospital) {
        const cleanCms = trimmed.replace(/^cms-/i, '');
        const cmsCandidates = [trimmed, cleanCms, `CMS-${cleanCms}`];
        if (aliasCmsId) {
          cmsCandidates.push(aliasCmsId, `CMS-${aliasCmsId}`);
        }

        hospital = await this.hospitalModel.findOne({
          where: {
            cmsId: { [Op.in]: cmsCandidates },
          },
        });
      }

      // 4. Search DB by name (ILIKE matching words from slug)
      if (!hospital) {
        const nameQuery = trimmed.replace(/-/g, ' ');
        hospital = await this.hospitalModel.findOne({
          where: {
            name: { [Op.iLike]: `%${nameQuery}%` },
          },
        });
      }

      // 5. STRICT CMS CSV CHECK: If still not found in DB, check Hospital_General_Information.csv
      if (!hospital) {
        const cmsRecord = findCmsHospitalBySlugOrName(trimmed);
        if (cmsRecord) {
          // Check if it exists in DB by the CMS record's ID
          hospital = await this.hospitalModel.findOne({
            where: {
              cmsId: { [Op.in]: [cmsRecord.cmsId, `CMS-${cmsRecord.cmsId}`] },
            },
          });

          // If not in DB at all, insert it from the official CMS CSV record
          if (!hospital) {
            hospital = await this.hospitalModel.create({
              cmsId: cmsRecord.cmsId,
              name: cmsRecord.name,
              city: cmsRecord.city,
              state: cmsRecord.state,
              facilityType: cmsRecord.facilityType,
              averageRating: 0,
              source: 'CMS',
              isActive: true,
            });
          }
        }
      }

      if (!hospital) {
        throw new NotFoundException(HOSPITAL_RESPONSE.NOT_FOUND);
      }

      return this.buildHospitalDetailResponse(hospital);
    } catch (error) {
      handleDatabaseException(error, {
        context: HospitalsService.name,
        operation: 'hospital slug lookup',
      });
    }
  }

  private async buildHospitalDetailResponse(
    hospital: HospitalModel,
  ): Promise<ControllerResponse<HospitalDetailResponseDto>> {
    const [hospitalUnits, approvedReviewCount, reviewStats] =
      await Promise.all([
        this.hospitalUnitModel.findAll({
          where: { hospitalId: hospital.id, deletedAt: null },
          include: [{ model: UnitModel, where: { deletedAt: null } }],
        }),
        this.reviewModel.count({
          where: { hospitalId: hospital.id, status: 'approved' },
        }),
        this.getReviewStatsForHospitals([hospital.id]).then(
          (stats) => stats.get(hospital.id) ?? buildHospitalReviewStats([]),
        ),
      ]);

    const units = hospitalUnits
      .map((hospitalUnit) => hospitalUnit.unit)
      .filter((unit): unit is UnitModel => Boolean(unit))
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      message: HOSPITAL_RESPONSE.FETCH_ONE,
      data: {
        ...this.toHospitalResponse(
          hospital,
          approvedReviewCount,
          reviewStats,
        ),
        units: units.map((unit) => this.toUnitResponse(unit)),
        approvedReviewCount,
      },
    };
  }

  async exists(id: number): Promise<boolean> {
    try {
      return (await this.hospitalModel.count({ where: { id } })) > 0;
    } catch (error) {
      handleDatabaseException(error, {
        context: HospitalsService.name,
        operation: 'hospital existence check',
      });
    }
  }

  private async findHospitals(
    query: ListHospitalsQueryDto,
    searchText?: string,
  ): Promise<HospitalsListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const where: Record<string | symbol, unknown> = {};

    if (query.city) {
      where.city = { [Op.iLike]: `%${query.city.trim()}%` };
    }

    if (query.state) {
      const stateValues = resolveStateSearchValues(query.state);

      where.state =
        stateValues.length === 1
          ? { [Op.iLike]: `%${stateValues[0]}%` }
          : {
              [Op.or]: stateValues.map((value) => ({
                [Op.iLike]: `%${value}%`,
              })),
            };
    }

    if (query.facilityType) {
      where.facilityType = { [Op.iLike]: `%${query.facilityType.trim()}%` };
    }

    if (query.minRating !== undefined || query.maxRating !== undefined) {
      where.averageRating = {
        ...(query.minRating !== undefined ? { [Op.gte]: query.minRating } : {}),
        ...(query.maxRating !== undefined ? { [Op.lte]: query.maxRating } : {}),
      };
    }

    if (searchText) {
      const aliasCmsId = getHospitalAliasCmsId(searchText);
      const searchConditions: any[] = [
        { cmsId: { [Op.iLike]: `%${searchText}%` } },
        { name: { [Op.iLike]: `%${searchText}%` } },
        { city: { [Op.iLike]: `%${searchText}%` } },
        { state: { [Op.iLike]: `%${searchText}%` } },
        { facilityType: { [Op.iLike]: `%${searchText}%` } },
      ];

      if (aliasCmsId) {
        searchConditions.push(
          { cmsId: aliasCmsId },
          { cmsId: `CMS-${aliasCmsId}` },
        );
      }

      const words = searchText.split(/\s+/).filter(Boolean);
      if (words.length > 1) {
        searchConditions.push({
          name: { [Op.and]: words.map((w) => ({ [Op.iLike]: `%${w}%` })) },
        });
      }

      where[Op.or] = searchConditions;
    }

    let dbOrder: any[] = [
      ['averageRating', 'DESC'],
      ['name', 'ASC'],
    ];

    if (query.sort === 'recent') {
      dbOrder = [['createdAt', 'DESC']];
    } else if (query.sort === 'lowest') {
      dbOrder = [
        ['averageRating', 'ASC'],
        ['name', 'ASC'],
      ];
    } else if (query.sort === 'highest') {
      dbOrder = [
        ['averageRating', 'DESC'],
        ['name', 'ASC'],
      ];
    }

    const { rows, count } = await this.hospitalModel.findAndCountAll({
      where,
      limit,
      offset,
      order: dbOrder,
    });

    const hospitalIds = rows.map((hospital) => hospital.id);

    const [reviewCounts, reviewStats] = await Promise.all([
      this.getApprovedReviewCounts(hospitalIds),
      this.getReviewStatsForHospitals(hospitalIds),
    ]);

    return {
      items: rows.map((hospital) =>
        this.toHospitalResponse(
          hospital,
          reviewCounts.get(hospital.id) ?? 0,
          reviewStats.get(hospital.id),
        ),
      ),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: count === 0 ? 0 : Math.ceil(count / limit),
      },
    };
  }

  private async getApprovedReviewCounts(
    hospitalIds: number[],
  ): Promise<Map<number, number>> {
    if (hospitalIds.length === 0) {
      return new Map();
    }

    const rows = await this.reviewModel.findAll({
      attributes: ['hospitalId', [fn('COUNT', col('id')), 'count']],
      where: {
        hospitalId: { [Op.in]: hospitalIds },
        status: 'approved',
      },
      group: ['hospitalId'],
      raw: true,
    });

    return new Map(
      rows.map((row) => {
        const entry = row as unknown as {
          hospitalId: number;
          count: string | number;
        };

        return [Number(entry.hospitalId), Number(entry.count ?? 0)];
      }),
    );
  }

  private async getReviewStatsForHospitals(
    hospitalIds: number[],
  ): Promise<Map<number, HospitalReviewStats>> {
    if (hospitalIds.length === 0) {
      return new Map();
    }

    const reviews = await this.reviewModel.findAll({
      where: {
        hospitalId: { [Op.in]: hospitalIds },
        status: 'approved',
      },
      include: [RoleModel],
    });

    const grouped = new Map<number, ReviewModel[]>();

    for (const review of reviews) {
      const existing = grouped.get(review.hospitalId) ?? [];
      existing.push(review);
      grouped.set(review.hospitalId, existing);
    }

    return new Map(
      hospitalIds.map((hospitalId) => [
        hospitalId,
        buildHospitalReviewStats(grouped.get(hospitalId) ?? []),
      ]),
    );
  }

  private toHospitalResponse(
    hospital: HospitalModel,
    approvedReviewCount = 0,
    reviewStats?: HospitalReviewStats,
  ): HospitalResponseDto {
    return {
      id: hospital.id,
      cmsId: hospital.cmsId,
      name: hospital.name,
      city: hospital.city,
      state: hospital.state,
      facilityType: hospital.facilityType,
      averageRating: Number(hospital.averageRating ?? 0),
      slug: toHospitalSlug(hospital.name, hospital.id),
      approvedReviewCount,
      avgRnPay: reviewStats?.avgRnPay,
      avgRatio: reviewStats?.avgRatio,
      mealBreaks: reviewStats?.mealBreaks,
      parking: reviewStats?.parking,
      createdAt: hospital.createdAt,
    };
  }

  private toUnitResponse(unit: UnitModel): UnitResponseDto {
    return {
      id: unit.id,
      name: unit.name,
    };
  }
}
