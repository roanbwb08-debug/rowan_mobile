export type ProductVariant={id:string;name:string;price:number;currency:string;available:boolean}
export type Product={id:string;storeId:string;name:string;description:string;imageUrl:string;productUrl:string;category:string;tags:string[];price:number;currency:string;available:boolean;variants:ProductVariant[]}
export type FAQ={question:string;answer:string}
export type StoreKnowledge={storeName:string;description:string;shipping?:string;returns?:string;refunds?:string;contact?:string;hours?:string;faqs:FAQ[]}
export type Store={id:string;merchantId:string;name:string;knowledge:StoreKnowledge}
export type Merchant={id:string;name:string}
