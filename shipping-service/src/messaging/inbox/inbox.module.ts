import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboxEntity } from './inbox.entity';
import { InboxService } from './inbox.service';

@Module({
  imports: [TypeOrmModule.forFeature([InboxEntity])],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
