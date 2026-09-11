import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ControllerResponse } from '../../common/interfaces/controller-response.interface';
import {
  GetHospitalByIdSwagger,
  GetHospitalBySlugSwagger,
  GetHospitalFiltersSwagger,
  GetHospitalSearchSwagger,
  GetHospitalsSwagger,
} from './docs/hospitals.swagger';
import { HospitalDetailResponseDto } from './dto/hospital-detail-response.dto';
import { HospitalFiltersResponseDto } from './dto/hospital-filters-response.dto';
import { HospitalsListResponseDto } from './dto/hospitals-list-response.dto';
import { ListHospitalsQueryDto } from './dto/list-hospitals-query.dto';
import { SearchHospitalsQueryDto } from './dto/search-hospitals-query.dto';
import {
  HospitalFiltersService,
  HospitalsService,
} from './hospitals.providers';

@ApiTags('Hospitals')
@Controller('hospitals')
export class HospitalsController {
  constructor(
    private readonly hospitalsService: HospitalsService,
    private readonly hospitalFiltersService: HospitalFiltersService,
  ) {}

  @Get()
  @GetHospitalsSwagger()
  findAll(
    @Query() query: ListHospitalsQueryDto,
  ): Promise<ControllerResponse<HospitalsListResponseDto>> {
    return this.hospitalsService.findAll(query);
  }

  @Get('filters')
  @GetHospitalFiltersSwagger()
  getFilters(): Promise<ControllerResponse<HospitalFiltersResponseDto>> {
    return this.hospitalFiltersService.getFilters();
  }

  @Get('search')
  @GetHospitalSearchSwagger()
  searchHospitals(
    @Query() query: SearchHospitalsQueryDto,
  ): Promise<ControllerResponse<HospitalsListResponseDto>> {
    return this.hospitalsService.searchHospitals(query);
  }

  @Get('by-slug/:slug')
  @GetHospitalBySlugSwagger()
  findBySlug(
    @Param('slug') slug: string,
  ): Promise<ControllerResponse<HospitalDetailResponseDto>> {
    return this.hospitalsService.findBySlug(slug);
  }

  @Get(':id')
  @GetHospitalByIdSwagger()
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ControllerResponse<HospitalDetailResponseDto>> {
    return this.hospitalsService.findById(id);
  }
}
