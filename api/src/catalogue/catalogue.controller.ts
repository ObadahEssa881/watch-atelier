import { Body, Controller, Get, HttpCode, Inject, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BuildDto } from "./build.dto";
import { CatalogueService } from "./catalogue.service";
import { validated } from "../setup";

@ApiTags("catalogue")
@Controller()
export class CatalogueController {
  constructor(@Inject(CatalogueService) private readonly catalogue: CatalogueService) {}

  @Get("catalogue")
  @ApiOperation({ summary: "Every case, dial and strap the Q-01 can be built from, with prices" })
  list() {
    return this.catalogue.all();
  }

  @Post("quotes")
  @HttpCode(200)
  @ApiOperation({ summary: "Price a build and estimate how long the atelier needs" })
  @ApiOkResponse({ description: "Price in USD, lead time in weeks and the line items" })
  quote(@Body(validated(BuildDto)) build: BuildDto) {
    return this.catalogue.quote(build);
  }
}
