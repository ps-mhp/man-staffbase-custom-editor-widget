/*!
 * Copyright 2026, MHP Management und IT-Beratung GmbH and contributors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { makeProbeString, describeProbe } from "./probe";

describe("makeProbeString", () => {
  it("hits the requested length exactly", () => {
    for (const size of [20, 100, 1_000, 12_345]) {
      expect(makeProbeString(size)).toHaveLength(size);
    }
  });

  it("uses only characters that survive an HTML attribute unescaped", () => {
    expect(makeProbeString(5_000)).toMatch(/^[A-Z0-9:.]+$/);
  });
});

describe("describeProbe", () => {
  it("reports an intact probe as untruncated", () => {
    const report = describeProbe(makeProbeString(1_000));

    expect(report).toMatchObject({ received: 1_000, expected: 1_000, truncated: false });
    expect(report.lastMarker).toBeLessThanOrEqual(1_000);
  });

  it("names the position a cut-off probe reached", () => {
    const report = describeProbe(makeProbeString(1_000).slice(0, 640));

    expect(report).toMatchObject({ received: 640, expected: 1_000, truncated: true, lastMarker: 631 });
  });

  it("stays silent about foreign content", () => {
    expect(describeProbe("hallo")).toMatchObject({ expected: null, lastMarker: null, truncated: false });
  });
});
