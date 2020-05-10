
export interface ICheckReqModel {
  EDP_PRECHECK: string;
  EDP_BILL_NO: number;
  EDP_REC_ACCOUNT: number;
  EDP_AMOUNT: number;
}

export interface ISuccessTransactionModel {
  EDP_BILL_NO: number;
  EDP_REC_ACCOUNT: number;
  EDP_PAYER_ACCOUNT: number;
  EDP_AMOUNT: number;
  EDP_TRANS_ID: number;
  EDP_TRANS_DATE: string; // dd/mm/yyyy
  EDP_CHECKSUM: any; // TODO -> ?
}
