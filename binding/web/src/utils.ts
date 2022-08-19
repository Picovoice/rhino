/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { RhinoContext } from './types';

import { fromBase64, fromPublicDirectory } from '@picovoice/web-utils';

export async function contextProcess(context: RhinoContext): Promise<string> {
  if (context === undefined || context === null) {
    throw new Error('The context argument is undefined / empty');
  }

  if (context.base64 !== undefined && context.base64 !== null) {
    await fromBase64(
      context.label,
      context.base64,
      context.forceWrite ?? false,
      1
    );
  } else if (context.publicPath !== undefined && context.publicPath !== null) {
    await fromPublicDirectory(
      context.label,
      context.publicPath,
      context.forceWrite ?? true,
      1
    );
  } else {
    throw new Error(
      "The context argument doesn't contain a valid publicPath or base64 argument"
    );
  }

  return context.label;
}
