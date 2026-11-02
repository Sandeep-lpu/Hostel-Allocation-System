import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { OutboundWebhookService } from './services/outbound-webhook.service';

@Controller('admin/webhooks')
export class AdminWebhooksController {
  constructor(private readonly webhookService: OutboundWebhookService) {}

  @Post('subscriptions')
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(@Body() body: any) {
    return this.webhookService.createSubscription(body);
  }

  @Get('subscriptions')
  async listSubscriptions(@Query('tenantId') tenantId: string = 'univ-delhi-hostel') {
    return this.webhookService.listSubscriptions(tenantId);
  }

  @Get('deliveries')
  async listDeliveries(
    @Query('tenantId') tenantId: string = 'univ-delhi-hostel',
    @Query('limit') limit: number = 50,
  ) {
    return this.webhookService.listDeliveries(tenantId, Number(limit));
  }

  @Post(':deliveryId/replay')
  @HttpCode(HttpStatus.OK)
  async replayDelivery(@Param('deliveryId') deliveryId: string) {
    return this.webhookService.replayDelivery(deliveryId);
  }
}

