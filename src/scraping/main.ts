import Application from '@scraping/application';
import { program } from 'commander';
import type { Regions } from '@scraping/rcdb-application';

program.option('--region <regionName>');
program.option('--saveData <boolean>');
program.option('--id <string>');

program.parse();

const { region = 'World', saveData = 'true', id = ''} = program.opts<{ region: Regions; saveData: string; id: string }>();

const app = new Application();

app.start({ region, saveData: saveData === 'true', id});
