// Copyright © 2018-2023 Kaleyra S.p.a. All Rights Reserved.
// See LICENSE for licensing information

#import "BCBBroadcastSampleHandler.h"

#import <BandyerBroadcastExtension/BandyerBroadcastExtension.h>

@implementation BCBBroadcastSampleHandler

- (void)broadcastStartedWithSetupInfo:(NSDictionary<NSString *,NSObject *> *)setupInfo
{
    __weak __typeof__(self) _wself = self;
    [BBEBroadcastExtension.instance startWithAppGroupIdentifier:@"__GROUP_IDENTIFIER__" setupInfo:setupInfo errorHandler:^(NSError * _Nonnull error) {
        __strong __typeof__(_wself) sself = _wself;
        [sself finishBroadcastWithError:error];
    }];
}

- (void)broadcastPaused
{
    [BBEBroadcastExtension.instance pause];
}

- (void)broadcastResumed
{
    [BBEBroadcastExtension.instance resume];
}

- (void)broadcastFinished
{
    [BBEBroadcastExtension.instance finish];
}

- (void)processSampleBuffer:(CMSampleBufferRef)sampleBuffer withType:(RPSampleBufferType)sampleBufferType
{
    [BBEBroadcastExtension.instance processSampleBuffer:sampleBuffer ofType:sampleBufferType];
}

@end
