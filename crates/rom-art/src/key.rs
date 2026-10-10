use std::fmt;
use std::str::FromStr;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Key {
    Sprite { species: u16, form: u8, shiny: bool, female: bool },
    AnimatedSprite { species: u16, form: u8, shiny: bool, female: bool },
    MenuIcon { species: u16, form: u8, female: bool },
    IndexSprite { index: u16, shiny: bool },
    IndexAnimatedSprite { index: u16, shiny: bool },
    IndexMenuIcon { index: u16 },
    Egg,
    EggIcon,
    ManaphyEgg,
    ManaphyEggIcon,
    Item(u16),
}

impl Key {
    pub fn animated(self) -> Option<Key> {
        match self {
            Key::Sprite { species, form, shiny, female } => Some(Key::AnimatedSprite { species, form, shiny, female }),
            Key::IndexSprite { index, shiny } => Some(Key::IndexAnimatedSprite { index, shiny }),
            _ => None,
        }
    }
}

impl fmt::Display for Key {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let flag = |on: bool, name: &'static str| if on { name } else { "" };
        match *self {
            Key::Sprite { species, form, shiny, female } => {
                write!(f, "sprite-{species}-{form}{}{}", flag(female, "-female"), flag(shiny, "-shiny"))
            }
            Key::AnimatedSprite { species, form, shiny, female } => {
                write!(f, "anim-{species}-{form}{}{}", flag(female, "-female"), flag(shiny, "-shiny"))
            }
            Key::MenuIcon { species, form, female } => write!(f, "icon-{species}-{form}{}", flag(female, "-female")),
            Key::IndexSprite { index, shiny } => {
                write!(f, "sprite-index-{index}{}", flag(shiny, "-shiny"))
            }
            Key::IndexAnimatedSprite { index, shiny } => write!(f, "anim-index-{index}{}", flag(shiny, "-shiny")),
            Key::IndexMenuIcon { index } => write!(f, "icon-index-{index}"),
            Key::Egg => f.write_str("egg"),
            Key::EggIcon => f.write_str("icon-egg"),
            Key::ManaphyEgg => f.write_str("egg-manaphy"),
            Key::ManaphyEggIcon => f.write_str("icon-egg-manaphy"),
            Key::Item(id) => write!(f, "item-{id}"),
        }
    }
}

fn number<T: FromStr>(parts: &[&str], at: usize) -> Option<T> {
    parts.get(at)?.parse().ok()
}

impl FromStr for Key {
    type Err = String;

    fn from_str(name: &str) -> Result<Key, String> {
        let invalid = || format!("{name}: not a game art key");
        let mut parts = name.split('-');
        let kind = parts.next().ok_or_else(invalid)?;
        let rest: Vec<&str> = parts.collect();
        let flags = |from: usize| rest.get(from..).unwrap_or_default();
        let key = match kind {
            "egg" if rest.is_empty() => Key::Egg,
            "egg" if rest == ["manaphy"] => Key::ManaphyEgg,
            "icon" if rest == ["egg"] => Key::EggIcon,
            "icon" if rest == ["egg", "manaphy"] => Key::ManaphyEggIcon,
            "item" => Key::Item(number(&rest, 0).ok_or_else(invalid)?),
            "sprite" if rest.first() == Some(&"index") => {
                Key::IndexSprite { index: number(&rest, 1).ok_or_else(invalid)?, shiny: flags(2).contains(&"shiny") }
            }
            "anim" if rest.first() == Some(&"index") => Key::IndexAnimatedSprite {
                index: number(&rest, 1).ok_or_else(invalid)?,
                shiny: flags(2).contains(&"shiny"),
            },
            "icon" if rest.first() == Some(&"index") => {
                Key::IndexMenuIcon { index: number(&rest, 1).ok_or_else(invalid)? }
            }
            "sprite" => Key::Sprite {
                species: number(&rest, 0).ok_or_else(invalid)?,
                form: number(&rest, 1).ok_or_else(invalid)?,
                female: flags(2).contains(&"female"),
                shiny: flags(2).contains(&"shiny"),
            },
            "anim" => Key::AnimatedSprite {
                species: number(&rest, 0).ok_or_else(invalid)?,
                form: number(&rest, 1).ok_or_else(invalid)?,
                female: flags(2).contains(&"female"),
                shiny: flags(2).contains(&"shiny"),
            },
            "icon" => Key::MenuIcon {
                species: number(&rest, 0).ok_or_else(invalid)?,
                form: number(&rest, 1).ok_or_else(invalid)?,
                female: flags(2).contains(&"female"),
            },
            _ => return Err(invalid()),
        };
        // Only the one spelling Display writes is a key, so a key always names the same file.
        if key.to_string() == name {
            Ok(key)
        } else {
            Err(invalid())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEYS: [Key; 16] = [
        Key::Sprite { species: 25, form: 0, shiny: false, female: false },
        Key::Sprite { species: 201, form: 27, shiny: true, female: false },
        Key::Sprite { species: 407, form: 0, shiny: true, female: true },
        Key::MenuIcon { species: 521, form: 0, female: true },
        Key::IndexSprite { index: 706, shiny: false },
        Key::IndexSprite { index: 706, shiny: true },
        Key::IndexMenuIcon { index: 706 },
        Key::AnimatedSprite { species: 25, form: 0, shiny: false, female: false },
        Key::AnimatedSprite { species: 407, form: 0, shiny: true, female: true },
        Key::IndexAnimatedSprite { index: 412, shiny: false },
        Key::IndexAnimatedSprite { index: 412, shiny: true },
        Key::Egg,
        Key::EggIcon,
        Key::ManaphyEgg,
        Key::ManaphyEggIcon,
        Key::Item(4),
    ];

    #[test]
    fn names_each_key() {
        assert_eq!(
            KEYS.map(|key| key.to_string()),
            [
                "sprite-25-0",
                "sprite-201-27-shiny",
                "sprite-407-0-female-shiny",
                "icon-521-0-female",
                "sprite-index-706",
                "sprite-index-706-shiny",
                "icon-index-706",
                "anim-25-0",
                "anim-407-0-female-shiny",
                "anim-index-412",
                "anim-index-412-shiny",
                "egg",
                "icon-egg",
                "egg-manaphy",
                "icon-egg-manaphy",
                "item-4",
            ]
        );
    }

    #[test]
    fn reads_a_key_back_from_its_name() {
        for key in KEYS {
            assert_eq!(key.to_string().parse(), Ok(key));
        }
    }

    #[test]
    fn animates_only_sprites() {
        assert_eq!(KEYS[0].animated(), Some(KEYS[7]));
        assert_eq!(KEYS[2].animated(), Some(KEYS[8]));
        assert_eq!(Key::IndexSprite { index: 412, shiny: true }.animated(), Some(KEYS[10]));
        assert_eq!(Key::MenuIcon { species: 25, form: 0, female: false }.animated(), None);
        assert_eq!(Key::Egg.animated(), None);
    }

    #[test]
    fn refuses_names_that_are_not_keys() {
        for name in [
            "",
            "sprite",
            "sprite-25",
            "sprite-025-0",
            "sprite-25-0-shiny-female",
            "sprite-25-0-shiny-shiny",
            "sprite-25-0-big",
            "sprite-70000-0",
            "icon-25-0-shiny",
            "sprite-index",
            "sprite-index-706-female",
            "icon-index-706-shiny",
            "anim",
            "anim-25",
            "anim-25-0-shiny-female",
            "anim-index",
            "anim-index-412-female",
            "egg-1",
            "egg-phione",
            "icon-egg-phione",
            "item--1",
            "item-4.png",
            "../item-4",
        ] {
            assert!(name.parse::<Key>().is_err(), "{name}");
        }
    }
}
