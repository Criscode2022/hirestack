import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BILLING_PLAN_IDS, BillingPlan } from '@hirestack/shared';

export class SubscribeDto {
  @ApiProperty({ enum: BILLING_PLAN_IDS })
  @IsIn(BILLING_PLAN_IDS)
  plan!: BillingPlan;
}
