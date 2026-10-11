import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, Matches, MaxLength } from "class-validator";
import { CASE_IDS, DIAL_IDS, ENGRAVING, STRAP_IDS, type CaseId, type DialId, type StrapId } from "./catalogue.data";

/** One configured Q-01. Every field is checked against the catalogue. */
export class BuildDto {
  @ApiProperty({ enum: CASE_IDS, example: "steel" })
  @IsIn(CASE_IDS)
  case: CaseId;

  @ApiProperty({ enum: DIAL_IDS, example: "ink" })
  @IsIn(DIAL_IDS)
  dial: DialId;

  @ApiProperty({ enum: STRAP_IDS, example: "black" })
  @IsIn(STRAP_IDS)
  strap: StrapId;

  @ApiProperty({ maxLength: ENGRAVING.maxLength, example: "For Lina, 2026", required: false, default: "" })
  @IsString()
  @MaxLength(ENGRAVING.maxLength)
  // letters (any script), digits, spaces and a little punctuation: what a pantograph can engrave
  @Matches(/^[\p{L}\p{N} .,'’&·\-/]*$/u, { message: "engraving may contain letters, digits, spaces and . , ' & · - / only" })
  engraving: string = "";
}
