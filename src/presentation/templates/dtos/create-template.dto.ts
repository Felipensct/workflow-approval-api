import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @MaxLength(500)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
