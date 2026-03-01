import { IsObject } from 'class-validator';

export class CreateVersionDto {
  @IsObject()
  definition: Record<string, unknown>;
}
