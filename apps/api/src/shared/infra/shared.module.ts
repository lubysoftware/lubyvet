import { Global, Module } from '@nestjs/common';
import { CLOCK } from '../domain/clock';
import { PrismaService } from './prisma.service';
import { SystemClock } from './system-clock';

@Global()
@Module({
  providers: [PrismaService, { provide: CLOCK, useClass: SystemClock }],
  exports: [PrismaService, CLOCK],
})
export class SharedModule {}
