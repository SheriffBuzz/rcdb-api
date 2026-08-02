import { __COASTERS_DB_FILENAME__ } from '@app/constants';
import JsonDB from '@app/db';
import { PaginatedResponse } from '@app/models';
import type { RollerCoaster } from '@app/types';
import { getRandom } from '@app/utils';
import { Service } from '@lib/decorators';
import MiniSearch from "minisearch";

@Service()
export default class RollerCoasterService {
  private _db: JsonDB;
  private _coasterIndex?: MiniSearch;
  private _indexedCoasters?: RollerCoaster[];
  private _coasterMap?: Map<String, RollerCoaster>;

  constructor() {
    this._db = JsonDB.getInstance();
  }

  private async _getCoasterIndex(): Promise<MiniSearch> {
    const coasters = await this._getCoastersDB();

    if (this._coasterIndex && this._indexedCoasters === coasters) {
      return this._coasterIndex;
    }

    const miniSearch = new MiniSearch({
      fields: ["name", "parkName"],
      storeFields: ["id"],
      searchOptions: {
        prefix: true,
        fuzzy: 0.2
      }
    });

    miniSearch.addAll(
      coasters.map((coaster) => ({
        id: coaster.id,
        name: coaster.name,
        parkName: coaster.park.name
      }))
    );

    this._coasterMap = new Map(
      coasters.map((coaster) => [String(coaster.id), coaster])
    );

    this._coasterIndex = miniSearch;
    this._indexedCoasters = coasters;

    return miniSearch;
  }

  private async _getCoastersDB(): Promise<RollerCoaster[]> {
    return await this._db.readDBFile<RollerCoaster[]>(__COASTERS_DB_FILENAME__);
  }

  public async getPaginatedCoasters(offset: number, limit: number): Promise<PaginatedResponse<RollerCoaster>> {
    const coasters: RollerCoaster[] = await this._getCoastersDB();
    const paginatedResponse = new PaginatedResponse<RollerCoaster>(coasters, offset, limit);

    return paginatedResponse;
  }

  public async getCoasterById(id: number): Promise<RollerCoaster | undefined> {
    const coasters: RollerCoaster[] = await this._getCoastersDB();

    return coasters.find(({ id: coasterId }: RollerCoaster) => coasterId === id);
  }

  public async getRandomCoaster(): Promise<RollerCoaster> {
    const coasters: RollerCoaster[] = await this._getCoastersDB();
    const randomIndex: number = getRandom(0, coasters.length);

    return coasters[randomIndex];
  }

  public intersectById<T extends { id: string | number }>(
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

  public async searchCoasters(
    name: string,
    parkName: string,
  ): Promise<Omit<RollerCoaster, 'pictures'>[]> {

    const index = await this._getCoasterIndex();

    const rideResults = index
      .search(name, {
        combineWith: 'AND',
        fuzzy: 0.2
      });

    const parkResults = index
      .search(parkName, {
        combineWith: 'AND',
        fuzzy: 0.2
      });

    const matches = this.intersectById(
      (parkName) ? parkResults : rideResults,
      rideResults
    );

    return matches
      .map((hit) => this._coasterMap!.get(String(hit.id)))
      .filter((coaster): coaster is RollerCoaster => !!coaster)
      .map(({ pictures, ...coaster }) => coaster);
  }
}
