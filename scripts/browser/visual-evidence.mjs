/** Test-only screenshot evidence. Passing CI runs never emit expensive
 * image captures; explicitly opt in for deliberate human visual review.
 * Unexpected failures are captured separately by openHarness().diagnose().
 */
import {mkdir} from "node:fs/promises";
import {dirname} from "node:path";

export function visualReviewEnabled(env=process.env){
 return env.PRACTICE_DESK_VISUAL_REVIEW==="1";
}
export async function captureVisualEvidence(page,path,options={}){
 if(!visualReviewEnabled())return false;
 await mkdir(dirname(path),{recursive:true});
 await page.screenshot({path,animations:"disabled",...options});
 return true;
}
