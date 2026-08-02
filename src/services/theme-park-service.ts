import { Service } from '@lib/decorators';
import JsonDB from '@app/db';
import type { ThemePark } from '@app/types';
import { __THEME_PARKS_DB_FILENAME__ } from 'constants/database';
import { PaginatedResponse } from '@app/models';
import MiniSearch from "minisearch";
import intersectById from '@app/utils';

@Service()
export default class ThemeParkService {
  private _dbJson: JsonDB;
  private _themeParkIndex?: MiniSearch;
  private _indexedThemeParks?: ThemePark[];
  private _themeParksMap?: Map<String, ThemePark>;

  constructor() {
    this._dbJson = JsonDB.getInstance();
  }

  private async _getThemeParksDb(): Promise<ThemePark[]> {
    return await this._dbJson.readDBFile<ThemePark[]>(__THEME_PARKS_DB_FILENAME__);
  }

  public async getPaginatedThemeParks(offset: number, limit: number): Promise<PaginatedResponse<ThemePark>> {
    const themeParks: ThemePark[] = await this._getThemeParksDb();
    const paginatedResponse = new PaginatedResponse<ThemePark>(themeParks, offset, limit);

    return paginatedResponse;
  }

  public async getThemeParkById(themeParkId: number): Promise<ThemePark | undefined> {
    const themeParks: ThemePark[] = await this._getThemeParksDb();

    return themeParks.find(({ id }: ThemePark) => id === themeParkId);
  }

  private async _getThemeParkIndex(): Promise<MiniSearch> {
    const themeParks = await this._getThemeParksDb();

    if (this._themeParkIndex && this._indexedThemeParks === themeParks) {
      return this._themeParkIndex;
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
      themeParks.map((themePark) => ({
        id: themePark.id,
        name: themePark.name
      }))
    );

    this._themeParksMap = new Map(
      themeParks.map((themePark) => [String(themePark.id), themePark])
    );

    this._themeParkIndex = miniSearch;
    this._indexedThemeParks = themeParks;

    return miniSearch;
  }

  public async searchThemeParks(
      name: string,
    ): Promise<Omit<ThemePark, 'pictures'>[]> {
  
      const index = await this._getThemeParkIndex();
  
      const parkResults = index
        .search(name, {
          combineWith: 'AND',
          fuzzy: 0.2
        });
  
      const matches = parkResults;
      
      return matches
        .map((hit) => this._themeParksMap!.get(String(hit.id)))
        .filter((themePark): themePark is ThemePark => !!themePark)
        .map(({ pictures, ...themePark }) => themePark);
    }
}
