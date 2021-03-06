'use strict';

Vue.component('my-icon', {
    functional: true,
    render: function (h, ctx) {
        let item = ctx.props.item;
        return h('li', ctx.data, [
            h('i', { attrs: { class: `fa fa-${item.value} fa-fw` } })
        ]);
    },
    props: {
        item: { type: Object, required: true }
    }
});

Vue.filter('formatCustomIcon', function (customIcon, id, type) {
    if (customIcon)
        if (customIcon.indexOf('built-in:') === 0)
            return `fa fa-${customIcon.replace('built-in:', '')} fa-fw`;
        else
            return `custom-icon feed-${id}`;
    else
        return type == 'feed' ? 'el-icon-document' : 'fa fa-folder fa-fw';
});

function iconSet() {
    return [
        { value: 'glass' },
        { value: 'music' },
        { value: 'search' },
        { value: 'envelope-o' },
        { value: 'heart' },
        { value: 'star' },
        { value: 'star-o' },
        { value: 'user' },
        { value: 'film' },
        { value: 'th-large' },
        { value: 'th' },
        { value: 'th-list' },
        { value: 'check' },
        { value: 'times' },
        { value: 'search-plus' },
        { value: 'search-minus' },
        { value: 'power-off' },
        { value: 'signal' },
        { value: 'cog' },
        { value: 'trash-o' },
        { value: 'home' },
        { value: 'file-o' },
        { value: 'clock-o' },
        { value: 'road' },
        { value: 'download' },
        { value: 'arrow-circle-o-down' },
        { value: 'arrow-circle-o-up' },
        { value: 'inbox' },
        { value: 'play-circle-o' },
        { value: 'repeat' },
        { value: 'refresh' },
        { value: 'list-alt' },
        { value: 'lock' },
        { value: 'flag' },
        { value: 'headphones' },
        { value: 'volume-off' },
        { value: 'volume-down' },
        { value: 'volume-up' },
        { value: 'qrcode' },
        { value: 'barcode' },
        { value: 'tag' },
        { value: 'tags' },
        { value: 'book' },
        { value: 'bookmark' },
        { value: 'print' },
        { value: 'camera' },
        { value: 'font' },
        { value: 'bold' },
        { value: 'italic' },
        { value: 'text-height' },
        { value: 'text-width' },
        { value: 'align-left' },
        { value: 'align-center' },
        { value: 'align-right' },
        { value: 'align-justify' },
        { value: 'list' },
        { value: 'outdent' },
        { value: 'indent' },
        { value: 'video-camera' },
        { value: 'picture-o' },
        { value: 'pencil' },
        { value: 'map-marker' },
        { value: 'adjust' },
        { value: 'tint' },
        { value: 'pencil-square-o' },
        { value: 'share-square-o' },
        { value: 'check-square-o' },
        { value: 'arrows' },
        { value: 'step-backward' },
        { value: 'fast-backward' },
        { value: 'backward' },
        { value: 'play' },
        { value: 'pause' },
        { value: 'stop' },
        { value: 'forward' },
        { value: 'fast-forward' },
        { value: 'step-forward' },
        { value: 'eject' },
        { value: 'chevron-left' },
        { value: 'chevron-right' },
        { value: 'plus-circle' },
        { value: 'minus-circle' },
        { value: 'times-circle' },
        { value: 'check-circle' },
        { value: 'question-circle' },
        { value: 'info-circle' },
        { value: 'crosshairs' },
        { value: 'times-circle-o' },
        { value: 'check-circle-o' },
        { value: 'ban' },
        { value: 'arrow-left' },
        { value: 'arrow-right' },
        { value: 'arrow-up' },
        { value: 'arrow-down' },
        { value: 'share' },
        { value: 'expand' },
        { value: 'compress' },
        { value: 'plus' },
        { value: 'minus' },
        { value: 'asterisk' },
        { value: 'exclamation-circle' },
        { value: 'gift' },
        { value: 'leaf' },
        { value: 'fire' },
        { value: 'eye' },
        { value: 'eye-slash' },
        { value: 'exclamation-triangle' },
        { value: 'plane' },
        { value: 'calendar' },
        { value: 'random' },
        { value: 'comment' },
        { value: 'magnet' },
        { value: 'chevron-up' },
        { value: 'chevron-down' },
        { value: 'retweet' },
        { value: 'shopping-cart' },
        { value: 'folder' },
        { value: 'folder-open' },
        { value: 'arrows-v' },
        { value: 'arrows-h' },
        { value: 'bar-chart' },
        { value: 'twitter-square' },
        { value: 'facebook-square' },
        { value: 'camera-retro' },
        { value: 'key' },
        { value: 'cogs' },
        { value: 'comments' },
        { value: 'thumbs-o-up' },
        { value: 'thumbs-o-down' },
        { value: 'star-half' },
        { value: 'heart-o' },
        { value: 'sign-out' },
        { value: 'linkedin-square' },
        { value: 'thumb-tack' },
        { value: 'external-link' },
        { value: 'sign-in' },
        { value: 'trophy' },
        { value: 'github-square' },
        { value: 'upload' },
        { value: 'lemon-o' },
        { value: 'phone' },
        { value: 'square-o' },
        { value: 'bookmark-o' },
        { value: 'phone-square' },
        { value: 'twitter' },
        { value: 'facebook' },
        { value: 'github' },
        { value: 'unlock' },
        { value: 'credit-card' },
        { value: 'rss' },
        { value: 'hdd-o' },
        { value: 'bullhorn' },
        { value: 'bell' },
        { value: 'certificate' },
        { value: 'hand-o-right' },
        { value: 'hand-o-left' },
        { value: 'hand-o-up' },
        { value: 'hand-o-down' },
        { value: 'arrow-circle-left' },
        { value: 'arrow-circle-right' },
        { value: 'arrow-circle-up' },
        { value: 'arrow-circle-down' },
        { value: 'globe' },
        { value: 'wrench' },
        { value: 'tasks' },
        { value: 'filter' },
        { value: 'briefcase' },
        { value: 'arrows-alt' },
        { value: 'users' },
        { value: 'link' },
        { value: 'cloud' },
        { value: 'flask' },
        { value: 'scissors' },
        { value: 'files-o' },
        { value: 'paperclip' },
        { value: 'floppy-o' },
        { value: 'square' },
        { value: 'bars' },
        { value: 'list-ul' },
        { value: 'list-ol' },
        { value: 'strikethrough' },
        { value: 'underline' },
        { value: 'table' },
        { value: 'magic' },
        { value: 'truck' },
        { value: 'pinterest' },
        { value: 'pinterest-square' },
        { value: 'google-plus-square' },
        { value: 'google-plus' },
        { value: 'money' },
        { value: 'caret-down' },
        { value: 'caret-up' },
        { value: 'caret-left' },
        { value: 'caret-right' },
        { value: 'columns' },
        { value: 'sort' },
        { value: 'sort-desc' },
        { value: 'sort-asc' },
        { value: 'envelope' },
        { value: 'linkedin' },
        { value: 'undo' },
        { value: 'gavel' },
        { value: 'tachometer' },
        { value: 'comment-o' },
        { value: 'comments-o' },
        { value: 'bolt' },
        { value: 'sitemap' },
        { value: 'umbrella' },
        { value: 'clipboard' },
        { value: 'lightbulb-o' },
        { value: 'exchange' },
        { value: 'cloud-download' },
        { value: 'cloud-upload' },
        { value: 'user-md' },
        { value: 'stethoscope' },
        { value: 'suitcase' },
        { value: 'bell-o' },
        { value: 'coffee' },
        { value: 'cutlery' },
        { value: 'file-text-o' },
        { value: 'building-o' },
        { value: 'hospital-o' },
        { value: 'ambulance' },
        { value: 'medkit' },
        { value: 'fighter-jet' },
        { value: 'beer' },
        { value: 'h-square' },
        { value: 'plus-square' },
        { value: 'angle-double-left' },
        { value: 'angle-double-right' },
        { value: 'angle-double-up' },
        { value: 'angle-double-down' },
        { value: 'angle-left' },
        { value: 'angle-right' },
        { value: 'angle-up' },
        { value: 'angle-down' },
        { value: 'desktop' },
        { value: 'laptop' },
        { value: 'tablet' },
        { value: 'mobile' },
        { value: 'circle-o' },
        { value: 'quote-left' },
        { value: 'quote-right' },
        { value: 'spinner' },
        { value: 'circle' },
        { value: 'reply' },
        { value: 'github-alt' },
        { value: 'folder-o' },
        { value: 'folder-open-o' },
        { value: 'smile-o' },
        { value: 'frown-o' },
        { value: 'meh-o' },
        { value: 'gamepad' },
        { value: 'keyboard-o' },
        { value: 'flag-o' },
        { value: 'flag-checkered' },
        { value: 'terminal' },
        { value: 'code' },
        { value: 'reply-all' },
        { value: 'star-half-o' },
        { value: 'location-arrow' },
        { value: 'crop' },
        { value: 'code-fork' },
        { value: 'chain-broken' },
        { value: 'question' },
        { value: 'info' },
        { value: 'exclamation' },
        { value: 'superscript' },
        { value: 'subscript' },
        { value: 'eraser' },
        { value: 'puzzle-piece' },
        { value: 'microphone' },
        { value: 'microphone-slash' },
        { value: 'shield' },
        { value: 'calendar-o' },
        { value: 'fire-extinguisher' },
        { value: 'rocket' },
        { value: 'maxcdn' },
        { value: 'chevron-circle-left' },
        { value: 'chevron-circle-right' },
        { value: 'chevron-circle-up' },
        { value: 'chevron-circle-down' },
        { value: 'html5' },
        { value: 'css3' },
        { value: 'anchor' },
        { value: 'unlock-alt' },
        { value: 'bullseye' },
        { value: 'ellipsis-h' },
        { value: 'ellipsis-v' },
        { value: 'rss-square' },
        { value: 'play-circle' },
        { value: 'ticket' },
        { value: 'minus-square' },
        { value: 'minus-square-o' },
        { value: 'level-up' },
        { value: 'level-down' },
        { value: 'check-square' },
        { value: 'pencil-square' },
        { value: 'external-link-square' },
        { value: 'share-square' },
        { value: 'compass' },
        { value: 'caret-square-o-down' },
        { value: 'caret-square-o-up' },
        { value: 'caret-square-o-right' },
        { value: 'eur' },
        { value: 'gbp' },
        { value: 'usd' },
        { value: 'inr' },
        { value: 'jpy' },
        { value: 'rub' },
        { value: 'krw' },
        { value: 'btc' },
        { value: 'file' },
        { value: 'file-text' },
        { value: 'sort-alpha-asc' },
        { value: 'sort-alpha-desc' },
        { value: 'sort-amount-asc' },
        { value: 'sort-amount-desc' },
        { value: 'sort-numeric-asc' },
        { value: 'sort-numeric-desc' },
        { value: 'thumbs-up' },
        { value: 'thumbs-down' },
        { value: 'youtube-square' },
        { value: 'youtube' },
        { value: 'xing' },
        { value: 'xing-square' },
        { value: 'youtube-play' },
        { value: 'dropbox' },
        { value: 'stack-overflow' },
        { value: 'instagram' },
        { value: 'flickr' },
        { value: 'adn' },
        { value: 'bitbucket' },
        { value: 'bitbucket-square' },
        { value: 'tumblr' },
        { value: 'tumblr-square' },
        { value: 'long-arrow-down' },
        { value: 'long-arrow-up' },
        { value: 'long-arrow-left' },
        { value: 'long-arrow-right' },
        { value: 'apple' },
        { value: 'windows' },
        { value: 'android' },
        { value: 'linux' },
        { value: 'dribbble' },
        { value: 'skype' },
        { value: 'foursquare' },
        { value: 'trello' },
        { value: 'female' },
        { value: 'male' },
        { value: 'gratipay' },
        { value: 'sun-o' },
        { value: 'moon-o' },
        { value: 'archive' },
        { value: 'bug' },
        { value: 'vk' },
        { value: 'weibo' },
        { value: 'renren' },
        { value: 'pagelines' },
        { value: 'stack-exchange' },
        { value: 'arrow-circle-o-right' },
        { value: 'arrow-circle-o-left' },
        { value: 'caret-square-o-left' },
        { value: 'dot-circle-o' },
        { value: 'wheelchair' },
        { value: 'vimeo-square' },
        { value: 'try' },
        { value: 'plus-square-o' },
        { value: 'space-shuttle' },
        { value: 'slack' },
        { value: 'envelope-square' },
        { value: 'wordpress' },
        { value: 'openid' },
        { value: 'university' },
        { value: 'graduation-cap' },
        { value: 'yahoo' },
        { value: 'google' },
        { value: 'reddit' },
        { value: 'reddit-square' },
        { value: 'stumbleupon-circle' },
        { value: 'stumbleupon' },
        { value: 'delicious' },
        { value: 'digg' },
        { value: 'pied-piper-pp' },
        { value: 'pied-piper-alt' },
        { value: 'drupal' },
        { value: 'joomla' },
        { value: 'language' },
        { value: 'fax' },
        { value: 'building' },
        { value: 'child' },
        { value: 'paw' },
        { value: 'spoon' },
        { value: 'cube' },
        { value: 'cubes' },
        { value: 'behance' },
        { value: 'behance-square' },
        { value: 'steam' },
        { value: 'steam-square' },
        { value: 'recycle' },
        { value: 'car' },
        { value: 'taxi' },
        { value: 'tree' },
        { value: 'spotify' },
        { value: 'deviantart' },
        { value: 'soundcloud' },
        { value: 'database' },
        { value: 'file-pdf-o' },
        { value: 'file-word-o' },
        { value: 'file-excel-o' },
        { value: 'file-powerpoint-o' },
        { value: 'file-image-o' },
        { value: 'file-archive-o' },
        { value: 'file-audio-o' },
        { value: 'file-video-o' },
        { value: 'file-code-o' },
        { value: 'vine' },
        { value: 'codepen' },
        { value: 'jsfiddle' },
        { value: 'life-ring' },
        { value: 'circle-o-notch' },
        { value: 'rebel' },
        { value: 'empire' },
        { value: 'git-square' },
        { value: 'git' },
        { value: 'hacker-news' },
        { value: 'tencent-weibo' },
        { value: 'qq' },
        { value: 'weixin' },
        { value: 'paper-plane' },
        { value: 'paper-plane-o' },
        { value: 'history' },
        { value: 'circle-thin' },
        { value: 'header' },
        { value: 'paragraph' },
        { value: 'sliders' },
        { value: 'share-alt' },
        { value: 'share-alt-square' },
        { value: 'bomb' },
        { value: 'futbol-o' },
        { value: 'tty' },
        { value: 'binoculars' },
        { value: 'plug' },
        { value: 'slideshare' },
        { value: 'twitch' },
        { value: 'yelp' },
        { value: 'newspaper-o' },
        { value: 'wifi' },
        { value: 'calculator' },
        { value: 'paypal' },
        { value: 'google-wallet' },
        { value: 'cc-visa' },
        { value: 'cc-mastercard' },
        { value: 'cc-discover' },
        { value: 'cc-amex' },
        { value: 'cc-paypal' },
        { value: 'cc-stripe' },
        { value: 'bell-slash' },
        { value: 'bell-slash-o' },
        { value: 'trash' },
        { value: 'copyright' },
        { value: 'at' },
        { value: 'eyedropper' },
        { value: 'paint-brush' },
        { value: 'birthday-cake' },
        { value: 'area-chart' },
        { value: 'pie-chart' },
        { value: 'line-chart' },
        { value: 'lastfm' },
        { value: 'lastfm-square' },
        { value: 'toggle-off' },
        { value: 'toggle-on' },
        { value: 'bicycle' },
        { value: 'bus' },
        { value: 'ioxhost' },
        { value: 'angellist' },
        { value: 'cc' },
        { value: 'ils' },
        { value: 'meanpath' },
        { value: 'buysellads' },
        { value: 'connectdevelop' },
        { value: 'dashcube' },
        { value: 'forumbee' },
        { value: 'leanpub' },
        { value: 'sellsy' },
        { value: 'shirtsinbulk' },
        { value: 'simplybuilt' },
        { value: 'skyatlas' },
        { value: 'cart-plus' },
        { value: 'cart-arrow-down' },
        { value: 'diamond' },
        { value: 'ship' },
        { value: 'user-secret' },
        { value: 'motorcycle' },
        { value: 'street-view' },
        { value: 'heartbeat' },
        { value: 'venus' },
        { value: 'mars' },
        { value: 'mercury' },
        { value: 'transgender' },
        { value: 'transgender-alt' },
        { value: 'venus-double' },
        { value: 'mars-double' },
        { value: 'venus-mars' },
        { value: 'mars-stroke' },
        { value: 'mars-stroke-v' },
        { value: 'mars-stroke-h' },
        { value: 'neuter' },
        { value: 'genderless' },
        { value: 'facebook-official' },
        { value: 'pinterest-p' },
        { value: 'whatsapp' },
        { value: 'server' },
        { value: 'user-plus' },
        { value: 'user-times' },
        { value: 'bed' },
        { value: 'viacoin' },
        { value: 'train' },
        { value: 'subway' },
        { value: 'medium' },
        { value: 'y-combinator' },
        { value: 'optin-monster' },
        { value: 'opencart' },
        { value: 'expeditedssl' },
        { value: 'battery-full' },
        { value: 'battery-three-quarters' },
        { value: 'battery-half' },
        { value: 'battery-quarter' },
        { value: 'battery-empty' },
        { value: 'mouse-pointer' },
        { value: 'i-cursor' },
        { value: 'object-group' },
        { value: 'object-ungroup' },
        { value: 'sticky-note' },
        { value: 'sticky-note-o' },
        { value: 'cc-jcb' },
        { value: 'cc-diners-club' },
        { value: 'clone' },
        { value: 'balance-scale' },
        { value: 'hourglass-o' },
        { value: 'hourglass-start' },
        { value: 'hourglass-half' },
        { value: 'hourglass-end' },
        { value: 'hourglass' },
        { value: 'hand-rock-o' },
        { value: 'hand-paper-o' },
        { value: 'hand-scissors-o' },
        { value: 'hand-lizard-o' },
        { value: 'hand-spock-o' },
        { value: 'hand-pointer-o' },
        { value: 'hand-peace-o' },
        { value: 'trademark' },
        { value: 'registered' },
        { value: 'creative-commons' },
        { value: 'gg' },
        { value: 'gg-circle' },
        { value: 'tripadvisor' },
        { value: 'odnoklassniki' },
        { value: 'odnoklassniki-square' },
        { value: 'get-pocket' },
        { value: 'wikipedia-w' },
        { value: 'safari' },
        { value: 'chrome' },
        { value: 'firefox' },
        { value: 'opera' },
        { value: 'internet-explorer' },
        { value: 'television' },
        { value: 'contao' },
        { value: '500px' },
        { value: 'amazon' },
        { value: 'calendar-plus-o' },
        { value: 'calendar-minus-o' },
        { value: 'calendar-times-o' },
        { value: 'calendar-check-o' },
        { value: 'industry' },
        { value: 'map-pin' },
        { value: 'map-signs' },
        { value: 'map-o' },
        { value: 'map' },
        { value: 'commenting' },
        { value: 'commenting-o' },
        { value: 'houzz' },
        { value: 'vimeo' },
        { value: 'black-tie' },
        { value: 'fonticons' },
        { value: 'reddit-alien' },
        { value: 'edge' },
        { value: 'credit-card-alt' },
        { value: 'codiepie' },
        { value: 'modx' },
        { value: 'fort-awesome' },
        { value: 'usb' },
        { value: 'product-hunt' },
        { value: 'mixcloud' },
        { value: 'scribd' },
        { value: 'pause-circle' },
        { value: 'pause-circle-o' },
        { value: 'stop-circle' },
        { value: 'stop-circle-o' },
        { value: 'shopping-bag' },
        { value: 'shopping-basket' },
        { value: 'hashtag' },
        { value: 'bluetooth' },
        { value: 'bluetooth-b' },
        { value: 'percent' },
        { value: 'gitlab' },
        { value: 'wpbeginner' },
        { value: 'wpforms' },
        { value: 'envira' },
        { value: 'universal-access' },
        { value: 'wheelchair-alt' },
        { value: 'question-circle-o' },
        { value: 'blind' },
        { value: 'audio-description' },
        { value: 'volume-control-phone' },
        { value: 'braille' },
        { value: 'assistive-listening-systems' },
        { value: 'american-sign-language-interpreting' },
        { value: 'deaf' },
        { value: 'glide' },
        { value: 'glide-g' },
        { value: 'sign-language' },
        { value: 'low-vision' },
        { value: 'viadeo' },
        { value: 'viadeo-square' },
        { value: 'snapchat' },
        { value: 'snapchat-ghost' },
        { value: 'snapchat-square' },
        { value: 'pied-piper' },
        { value: 'first-order' },
        { value: 'yoast' },
        { value: 'themeisle' },
        { value: 'google-plus-official' },
        { value: 'font-awesome' },
        { value: 'handshake-o' },
        { value: 'envelope-open' },
        { value: 'envelope-open-o' },
        { value: 'linode' },
        { value: 'address-book' },
        { value: 'address-book-o' },
        { value: 'address-card' },
        { value: 'address-card-o' },
        { value: 'user-circle' },
        { value: 'user-circle-o' },
        { value: 'user-o' },
        { value: 'id-badge' },
        { value: 'id-card' },
        { value: 'id-card-o' },
        { value: 'quora' },
        { value: 'free-code-camp' },
        { value: 'telegram' },
        { value: 'thermometer-full' },
        { value: 'thermometer-three-quarters' },
        { value: 'thermometer-half' },
        { value: 'thermometer-quarter' },
        { value: 'thermometer-empty' },
        { value: 'shower' },
        { value: 'bath' },
        { value: 'podcast' },
        { value: 'window-maximize' },
        { value: 'window-minimize' },
        { value: 'window-restore' },
        { value: 'window-close' },
        { value: 'window-close-o' },
        { value: 'bandcamp' },
        { value: 'grav' },
        { value: 'etsy' },
        { value: 'imdb' },
        { value: 'ravelry' },
        { value: 'eercast' },
        { value: 'microchip' },
        { value: 'snowflake-o' },
        { value: 'superpowers' },
        { value: 'wpexplorer' },
        { value: 'meetup' }
    ];

}