import {
  BadRequestException,
  Controller,
  Headers,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import type Stripe from 'stripe'; // type-only import; runtime Stripe object comes from StripeService
import { WebhooksService } from './webhooks.service';
import { StripeService } from '@/modules/billing/stripe.service';
import { Public } from '@/common/decorators';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly stripeService: StripeService,
  ) {}

  @Public()
  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body.');
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(rawBody, sig ?? '');
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${String(err)}`,
      );
      throw new BadRequestException(`Webhook error: ${String(err)}`);
    }

    await this.webhooksService.handleEvent(event);
    return { received: true };
  }
}
