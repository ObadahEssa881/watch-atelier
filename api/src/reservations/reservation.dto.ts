import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsOptional, IsString, Length, MaxLength, ValidateNested } from "class-validator";
import { BuildDto } from "../catalogue/build.dto";

export class CreateReservationDto {
  @ApiProperty({ type: BuildDto })
  @ValidateNested()
  @Type(() => BuildDto)
  build: BuildDto;

  @ApiProperty({ example: "Lina Haddad" })
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiProperty({ example: "lina@example.com" })
  @IsEmail()
  @MaxLength(120)
  email: string;

  @ApiProperty({ required: false, example: "Damascus" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
