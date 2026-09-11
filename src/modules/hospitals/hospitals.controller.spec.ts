import { Test, TestingModule } from '@nestjs/testing';

import { HospitalsController } from './hospitals.controller';
import { HospitalFiltersService } from './hospital-filters.service';
import { HospitalsService } from './hospitals.providers';

describe('HospitalsController', () => {
  let controller: HospitalsController;

  const hospitalsService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    searchHospitals: jest.fn(),
  };

  const hospitalFiltersService = {
    getFilters: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HospitalsController],
      providers: [
        { provide: HospitalsService, useValue: hospitalsService },
        { provide: HospitalFiltersService, useValue: hospitalFiltersService },
      ],
    }).compile();

    controller = module.get<HospitalsController>(HospitalsController);
  });

  it('should delegate findAll to service', async () => {
    const query = { page: 1, limit: 10 };

    hospitalsService.findAll.mockReturnValue({ message: 'ok', data: [] });
    await controller.findAll(query);

    expect(hospitalsService.findAll).toHaveBeenCalledWith(query);
  });

  it('should delegate search to service', async () => {
    const query = { query: 'boston', page: 1, limit: 10 };

    hospitalsService.searchHospitals.mockReturnValue({
      message: 'ok',
      data: [],
    });
    await controller.searchHospitals(query);

    expect(hospitalsService.searchHospitals).toHaveBeenCalledWith(query);
  });

  it('should delegate findById to service', async () => {
    hospitalsService.findById.mockReturnValue({
      message: 'ok',
      data: { id: 1 },
    });
    await controller.findOne(1);
    expect(hospitalsService.findById).toHaveBeenCalledWith(1);
  });

  it('should delegate findBySlug to service', async () => {
    hospitalsService.findBySlug.mockReturnValue({
      message: 'ok',
      data: { id: 1, slug: 'tampa-general-hospital-1' },
    });
    await controller.findBySlug('tampa-general-hospital');
    expect(hospitalsService.findBySlug).toHaveBeenCalledWith(
      'tampa-general-hospital',
    );
  });
});
