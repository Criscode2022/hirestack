import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MarketService } from './market.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('market')
@Controller()
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Public()
  @Get('search')
  search(@Query('q') q?: string) {
    return this.market.search(q);
  }

  @Public()
  @Get('market/tape')
  tape() {
    return this.market.tape();
  }

  @Public()
  @Get('insights/salaries')
  salaries() {
    return this.market.salaries();
  }
}
