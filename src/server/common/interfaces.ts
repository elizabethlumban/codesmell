export interface IMail {
    id: string;
    created: Date;
    subject: string;
    from: string[];
    to: string[];
    cc: string[];
    text: string;
    html?: string;
    _attachments?: any[];
    attachments: any[];
    transid: string;
    processed?: string;
    doc?: any[];
    annotation?: any;
}

export interface IMQMailBase {
    channel: string;
    mail: IMail;
}

export interface IBodyFile {
    content_type?: string;
    fileid: string;
    location: string;
}

export interface IBodyFileObject {
    [index: string]: any;
}

export interface IInsertReqRelated {
    reqid: string;
    reltype: string;
    reltypevalue: string;
    reltypedisplay: string;
    transid: string;
}

export interface IIShopzBody {
    attachmenttype: string;
    reqid: string;
    key: string;
    editor: string;
}

export interface IInsertDocs {
    id: string;
    reqid: string;
    created: string;
    createdby: string;
    file: string;
    attachmenttype: string;
    description: string;
    contenttype: string;
    fileid: string;
    doctype: number;
    template: string;
    download: number;
    status: string;
    transid?: string;
    machineserialno?: string;
}

export interface IUploadForm {
    attachmenttype: string;
    ['content-type']: string;
    created: string;
    reqid: string;
    _id: string;
    description: string;
    editor: string | any;
    content: IBodyFileObject;
    files: IBodyFileObject;
    createdby: string;
    form: string;
    machineserialno: string;
}
export interface IUpdateRequest {
    id: string;
    status: string;
    transid: string;
}

export interface IUpdateDocs {
    id: string;
    status: string;
    reqid: string;
    transid: string;
}

export interface IInsertParam {
    CCODE: string;
    COUNTRY: string;
    CURR: string;
    CUSTID: string;
    CUSTNAME: string;
    DOCSTATUS: string;
    DUEDATE: string;
    ID: string;
    ISO: string;
    MACHINESERIALNO: string;
    MARKET: string;
    OWNERGR: string;
    PERIOD: string;
    RELTYPE: string;
    RELTYPEDISPLAY: string;
    RELTYPEVALUE: string;
    REQ: string;
    REQFLAG: string;
    REQTYPE: string;
    STATUS: string;
    SUBJECT: string;
    TRANSID: string;
    REQNAME: string;
    REQEMAIL: string;
}

export interface IInsertParamShopz {
    CCODE: string;
    COUNTRY: string;
    CURR: string;
    CUSTID: string;
    CUSTNAME: string;
    DUEDATE: string;
    ID: string;
    ISO: string;
    MARKET: string;
    OWNERGR: string;
    RELTYPE: string;
    RELTYPEDISPLAY: string;
    RELTYPEVALUE: string;
    REQ: string;
    REQTYPE: string;
    STATUS: string;
    SUBJECT: string;
    TRANSID: string;
    REQNAME: string;
    REQEMAIL: string;
}
export interface IIShopzParse {
    countryVal: string;
    countryCode: string;
    countryName: string;
    custArrDate: string;
    custNoVal: string;
    requestStatus: string;
    requestType: string;
    ownerGroup: string;
    reqValue: string;
}

export interface IAdd {
    cc: string;
    custname: string;
    custnbr: string;
    email?: string;
    form?: string;
    id: string;
    mailTemplate: string;
    transid: string;
    recipients: string;
    shopzmailbody: string;
    subject: string;
    country: string;
}
export interface IShopzSellerMail {
    cc?: any[];
    contact: string;
    log: ILog;
    template: string;
    values: any;
    recipients: any[];
    subject: string;
    transid: string;
}
export interface ILog {
    id: string;
    transid: string;
    created: string;
    createdby: string;
    createdbyname: string;
    status: number;
    type: string;
    refid: string;
    event: string;
    action: string;
    message: string;
    logdb: string;
}
export interface IAnnotation {
    processed?: string;
    processedat?: string;
    reprocessed?: string;
    reprocessedat?: string;
    id: string;
}
