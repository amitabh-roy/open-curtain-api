import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { ControllerResponse } from '../../common/interfaces/controller-response.interface';
import { handleDatabaseException } from '../../common/utils/database-exception.util';
import { UnitModel } from '../../database/models/unit.model';
import { UNITS_RESPONSE } from './constants/units.response';
import { UnitOptionDto } from './dto/unit-option.dto';
import { UnitsListResponseDto } from './dto/units-list-response.dto';

@Injectable()
export class UnitsService {
  constructor(
    @InjectModel(UnitModel)
    private readonly unitModel: typeof UnitModel,
  ) {}

  async findAll(): Promise<ControllerResponse<UnitsListResponseDto>> {
    try {
      const rows = await this.unitModel.findAll({
        where: { deletedAt: null },
        order: [['name', 'ASC']],
      });

      const items: UnitOptionDto[] = rows.map((unit) => ({
        id: unit.id,
        name: unit.name,
      }));

      return {
        message: UNITS_RESPONSE.FETCH_ALL,
        data: { items },
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: UnitsService.name,
        operation: 'unit listing',
      });
    }
  }
}
