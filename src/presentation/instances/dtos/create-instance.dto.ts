import { IsUUID } from 'class-validator';

export class CreateInstanceDto {
  @IsUUID()
  template_version_id: string;
}
