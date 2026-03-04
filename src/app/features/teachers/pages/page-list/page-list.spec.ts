import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageList } from './page-list';

describe('PageList', () => {
  let component: PageList;
  let fixture: ComponentFixture<PageList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
