export { getRandom } from './get-random';
export { default as getNumberOnly } from './get-number-only';

export default function intersectById(
    a: string[],
    b: string[]
    ): string[] {
    const ids = new Set(b);
    const ids2 = new Set(a);
    console.log(ids);
    console.log(ids2);
    const filtered = a.filter(x => ids.has(x));
    console.log(filtered)
    return filtered
}