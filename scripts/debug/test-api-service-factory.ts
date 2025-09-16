import { ApiServiceFactory } from '@/lib/api/ApiServiceFactory';

try {
  const apiServices = ApiServiceFactory.getInstance();

  console.log(JSON.stringify({
    success: true,
    message: "ApiServiceFactory instantiated successfully",
    availableServices: [
      'alchemyTokenService',
      'etherscanEventService',
      'etherscanBlockInfoService',
      'evmBlockInfoService',
      'poolPriceService',
      'quoteTokenService',
      'positionService',
      'tokenService',
      'tokenResolutionService',
      'tokenReferenceService',
      'poolService',
      'positionLedgerService',
      'positionImportService',
      'positionPnLService',
      'curveDataService',
      'apiKeyService'
    ]
  }));
} catch (error) {
  console.log(JSON.stringify({
    error: error instanceof Error ? error.message : 'Unknown error'
  }));
}