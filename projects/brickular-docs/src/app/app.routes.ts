import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page.component';
import { TableApiPageComponent } from './pages/table-api-page.component';
import { TableExamplesPageComponent } from './pages/table-examples-page.component';
import { TableOverviewPageComponent } from './pages/table-overview-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'table/overview', component: TableOverviewPageComponent },
  { path: 'table/examples', component: TableExamplesPageComponent },
  { path: 'table/api', component: TableApiPageComponent },
  { path: '**', redirectTo: '' },
];
