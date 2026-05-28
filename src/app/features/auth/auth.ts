import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
@Component({
    selector: 'app-auth',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './auth.html',
    imports: [RouterOutlet]
})
export class Auth {

}