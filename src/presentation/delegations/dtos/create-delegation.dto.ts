import { IsUUID, IsDateString } from 'class-validator';

export class CreateDelegationDto {
  @IsUUID()
  delegate_id: string;

  @IsDateString()
  expires_at: string;
}
