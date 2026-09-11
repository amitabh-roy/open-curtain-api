import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
  Body,
  Post,
  Delete,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../users/interfaces/authenticated-user.interface';
import { ReviewAccountDeletionDto } from '../users/dto/review-account-deletion.dto';
import { AdminUpdateVerificationDto } from '../users/dto/admin-update-verification.dto';
import { AdminUpdateVerificationSwagger } from '../users/docs/users.swagger';
import { UsersService } from '../users/users.service';
import { AdminSecurityQueryDto } from './dto/admin-security-query.dto';
import { AdminService } from './admin.service';
import { AdminHospitalQueryDto } from './dto/admin-hospital-query.dto';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('flagged-accounts')
  listFlaggedAccounts() {
    return this.adminService.listFlaggedAccounts();
  }

  @Get('security')
  getSecurityActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminSecurityQueryDto,
  ) {
    return this.adminService.getSecurityActivity(user, query);
  }

  @Get('export/reviews')
  async exportReviews(@Res() res: Response) {
    const csv = await this.adminService.exportReviewsCsv();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="opencurtain-reviews.csv"',
    );
    res.send(csv);
  }

  @Get('account-deletion-requests')
  listAccountDeletionRequests() {
    return this.usersService.listPendingDeletionRequests();
  }

  @Patch('account-deletion-requests/:id')
  reviewAccountDeletionRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewAccountDeletionDto,
  ) {
    return this.usersService.reviewDeletionRequest(id, dto);
  }

  @Get('hospitals')
  listHospitals(@Query() query: AdminHospitalQueryDto) {
    return this.adminService.listHospitals(query);
  }

  @Get('hospitals/:id')
  getHospital(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getHospital(id);
  }

  @Post('hospitals')
  createHospital(@Body() dto: CreateHospitalDto) {
    return this.adminService.createHospital(dto);
  }

  @Patch('hospitals/:id')
  updateHospital(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHospitalDto,
  ) {
    return this.adminService.updateHospital(id, dto);
  }

  @Delete('hospitals/:id')
  deleteHospital(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteHospital(id);
  }

  @Post('users/:id/warn')
  warnUser(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.adminService.warnUser(id, reason);
  }

  @Post('users/:id/suspend')
  suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.adminService.suspendUser(id, reason);
  }

  @Post('users/:id/reactivate')
  reactivateUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.reactivateUser(id);
  }

  @Post('users/:id/clear-flag')
  clearFlag(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.clearFlag(id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteUser(id);
  }

  @Delete('reviews/:id')
  deleteReview(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteReview(id);
  }

  @Patch('users/:id/verification')
  @AdminUpdateVerificationSwagger()
  adminUpdateVerification(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateVerificationDto,
  ) {
    return this.usersService.adminUpdateVerification(id, dto);
  }
}
