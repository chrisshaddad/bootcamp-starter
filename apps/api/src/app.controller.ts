import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators';

/** Auto-generated docstring */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Auto-generated docstring */
  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }
}
