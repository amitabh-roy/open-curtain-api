import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';

import { ControllerResponse } from '../../common/interfaces/controller-response.interface';
import { handleDatabaseException } from '../../common/utils/database-exception.util';
import { RoleModel } from '../../database/models/role.model';
import { ROLES_RESPONSE } from './constants/roles.response';
import { RoleOptionDto } from './dto/role-option.dto';
import { RolesListResponseDto } from './dto/roles-list-response.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(RoleModel)
    private readonly roleModel: typeof RoleModel,
  ) {}

  async findAll(): Promise<ControllerResponse<RolesListResponseDto>> {
    try {
      const rows = await this.roleModel.findAll({
        where: {
          name: {
            [Op.ne]: 'admin',
          },
        },
      });

      const items: RoleOptionDto[] = rows
        .sort((a, b) => {
          if (a.name === 'Other') return 1;
          if (b.name === 'Other') return -1;
          return a.name.localeCompare(b.name);
        })
        .map((role) => ({
          id: role.id,
          name: role.name,
        }));

      return {
        message: ROLES_RESPONSE.FETCH_ALL,
        data: { items },
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: RolesService.name,
        operation: 'role listing',
      });
    }
  }
}
