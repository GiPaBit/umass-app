import { handleErrors, sendJson } from './_lib/http.js';
import { getRecData } from './_lib/rec/index.js';

/**
 * GET /api/rec -> everything behind the RecWell & Sports tab: facility hours,
 * group fitness schedule, aquatics, climbing, NEST, intramural deadlines and the
 * club sports directory. See api/_lib/rec/index.js for the per-source breakdown.
 */
export default handleErrors(async (req, res) => {
  const data = await getRecData();
  sendJson(res, data);
}, 'UMass RecWell');
