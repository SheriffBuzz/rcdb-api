import { __COASTERS_DB_FILENAME__ } from '@app/constants';
import JsonDB from '@app/db';
import { PaginatedResponse } from '@app/models';
import type { RollerCoaster } from '@app/types';
import intersectById, { getRandom } from '@app/utils';
import { Service } from '@lib/decorators';
import MiniSearch, { SearchResult } from "minisearch";

@Service()
export default class RollerCoasterService {
  private _db: JsonDB;
  private _coasterIndex?: MiniSearch;
  private _indexedCoasters?: RollerCoaster[];
  private _coasterMap?: Map<String, RollerCoaster>;
  private _parkToCoasterIds: Map<string, string[]>;

  constructor() {
    this._db = JsonDB.getInstance();
  }

  private async _getCoasterIndex(): Promise<MiniSearch> {
    const coasters = await this._getCoastersDB();

    if (this._coasterIndex && this._indexedCoasters === coasters) {
      return this._coasterIndex;
    }
    this._parkToCoasterIds = new Map<string, string[]>();
    for (const coaster of coasters) {
      const parkId = String(coaster.park.id);
      let coasterIds = this._parkToCoasterIds.get(parkId);
      if (!coasterIds) {
        coasterIds = [];
        this._parkToCoasterIds.set(parkId, coasterIds);
      }
      coasterIds.push(String(coaster.id));
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
        parkName: coaster.park.name,
        parkRcdbId: coaster.park.id
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

  public async searchCoasters(
    name: string,
    parkName: string,
    parkRcdbId: string,
  ): Promise<Omit<RollerCoaster, 'pictures'>[]> {

    const index = await this._getCoasterIndex();

    const rideResults = index
      .search(name, {
        combineWith: 'AND',
        fuzzy: 0.2
      })
      .map((hit) => String(hit.id));

    let parkResults: string[];
    if (parkRcdbId) {
      parkResults = this._parkToCoasterIds.get(parkRcdbId) || [];
    } else {
      parkResults = index
        .search(parkName, {
          combineWith: 'AND',
          fuzzy: 0.2
        })
        .map((hit) => String(hit.id));
    }
    
    let matches;
    if (name && (parkName || parkRcdbId)) {
      matches = intersectById(parkResults, rideResults);
    } else if (name) {
      matches = rideResults;
    } else if (parkName || parkRcdbId) {
      matches = parkResults;
    } else {
      console.log('No Filters given.');
      return []
    }

    return matches
      .map((id) => this._coasterMap!.get(String(id)))
      .filter((coaster): coaster is RollerCoaster => !!coaster)
      .map(({ pictures, ...coaster }) => coaster);
  }
}
