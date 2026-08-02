export { getRandom } from './get-random';
export { default as getNumberOnly } from './get-number-only';

export default function intersectById<T extends { id: string | number }>(
    a: T[],
    b: T[]
    ): T[] {
    const ids = new Set(b.map(x => x.id));
    const ids2 = new Set(a.map(x => x.id));
    console.log(ids);
    console.log(ids2);
    const filtered = a.filter(x => ids.has(x.id));
    console.log(filtered)
    return filtered
}