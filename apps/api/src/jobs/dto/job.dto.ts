import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { EmploymentType, Seniority, SkillWeight, Workplace } from '@hirestack/shared';

export class JobSkillInputDto {
  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ enum: SkillWeight })
  @IsOptional()
  @IsEnum(SkillWeight)
  weight?: SkillWeight;
}

export class UpsertJobDto {
  @ApiProperty()
  @IsString()
  @MinLength(4)
  @MaxLength(120)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(20)
  descriptionMd!: string;

  @ApiProperty({ enum: EmploymentType })
  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;

  @ApiProperty({ enum: Workplace })
  @IsEnum(Workplace)
  workplace!: Workplace;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpsertJobDto) => dto.workplace !== Workplace.REMOTE)
  @IsString()
  @MinLength(2)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: Seniority })
  @IsEnum(Seniority)
  seniority!: Seniority;

  @ApiProperty({ type: [JobSkillInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  skills!: JobSkillInputDto[];
}
