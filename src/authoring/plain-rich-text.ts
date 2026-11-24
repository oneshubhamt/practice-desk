import type {RichDocument} from "../domain/rich-document.ts";
import {richDocumentPlainText} from "../domain/rich-document.ts";

export function publicationPlainText(doc:RichDocument):string{
 return richDocumentPlainText(doc);
}
