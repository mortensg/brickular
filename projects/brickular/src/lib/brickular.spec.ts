import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Brickular } from './brickular';

describe('Brickular', () => {
  let component: Brickular;
  let fixture: ComponentFixture<Brickular>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Brickular]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Brickular);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
